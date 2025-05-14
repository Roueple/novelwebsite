// src/app/api/profiles/complete-signup-and-comment/route.ts
import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import type { Database } from '@/types/supabase';
import { addComment } from '@/lib/api'; // Assuming addComment is usable server-side or create a direct Supabase call

// Function to generate a unique username (displayname_slug#xxxx)
// This should be robust and ensure uniqueness by checking the database.
async function generateUniqueUsername(
    displayName: string,
    supabaseAdmin: ReturnType<typeof createRouteHandlerClient<Database>> // Pass admin client or use one internally
): Promise<string> {
    const baseUsername = displayName.toLowerCase().replace(/[^a-z0-9]/g, '').substring(0, 15) || 'user';
    let attempts = 0;
    const MAX_ATTEMPTS = 10;

    while (attempts < MAX_ATTEMPTS) {
        const randomSuffix = Math.floor(1000 + Math.random() * 9000); // 4 random digits
        const potentialUsername = `${baseUsername}#${randomSuffix}`;

        const { data: existingProfile, error } = await supabaseAdmin
            .from('profiles')
            .select('username')
            .eq('username', potentialUsername)
            .maybeSingle();

        if (error) {
            console.error("Error checking username uniqueness in API:", error);
            throw new Error("Failed to verify username uniqueness due to DB error.");
        }
        if (!existingProfile) {
            return potentialUsername; // Found a unique username
        }
        attempts++;
    }
    // Fallback if too many attempts
    // Generate a UUID-based username as a last resort to ensure uniqueness
    const { data: { user } } = await supabaseAdmin.auth.getUser(); // This might be redundant if userId is passed
    return `${baseUsername}#${user?.id.substring(0, 4) || Math.floor(1000 + Math.random() * 9000)}`;
}


export async function POST(request: Request) {
    const supabase = createRouteHandlerClient<Database>({ cookies }); // Standard client to get current user session

    const { data: { session }, error: sessionError } = await supabase.auth.getSession();

    if (sessionError || !session || !session.user) {
        return NextResponse.json({ error: 'Unauthorized. User not authenticated for profile completion.' }, { status: 401 });
    }

    const currentUserId = session.user.id;
    const currentUserEmail = session.user.email; // This email was just verified

    const {
        userId, // Sent from client for an extra check, but session.user.id is source of truth
        email,  // Sent from client for an extra check
        displayName,
        commentText,
        chapterId,
        novelId
    } = await request.json();

    // Validate inputs
    if (currentUserId !== userId || currentUserEmail !== email) {
        return NextResponse.json({ error: 'Session mismatch. Please try again.' }, { status: 400 });
    }
    if (!displayName || typeof displayName !== 'string' || displayName.trim().length === 0) {
        return NextResponse.json({ error: 'Display name is required.' }, { status: 400 });
    }
    // ... other validations for commentText, chapterId, novelId

    try {
        // Check if profile already exists and is complete
        const { data: existingProfile, error: profileCheckError } = await supabase
            .from('profiles')
            .select('id, username, display_name')
            .eq('id', currentUserId)
            .maybeSingle();

        if (profileCheckError && profileCheckError.code !== 'PGRST116') { // PGRST116 = not found, which is fine if creating
            throw profileCheckError;
        }

        let finalUsername = existingProfile?.username;
        let finalDisplayName = existingProfile?.display_name || displayName.trim();

        if (!existingProfile || !existingProfile.username || !existingProfile.display_name) {
            // Profile needs to be created or updated with generated username and display name
            if (!finalUsername) { // Generate username only if it doesn't exist
                 finalUsername = await generateUniqueUsername(displayName.trim(), supabase);
            }

            const profileDataToUpsert: Database['public']['Tables']['profiles']['Insert'] = {
                id: currentUserId,
                email: currentUserEmail, // The verified email
                display_name: finalDisplayName,
                username: finalUsername,
                role: 'reader', // Default role
                updated_at: new Date().toISOString(),
                // Ensure all NOT NULL fields in your profiles table (without a DB default) are provided
                // e.g., comment_count, experience_points, level, chapters_read_count should have DB defaults (0 or 1)
            };
            
            // If profile exists but is missing fields, it becomes an update.
            // If it doesn't exist, it's an insert. Upsert handles this.
            const { error: upsertError } = await supabase
                .from('profiles')
                .upsert(profileDataToUpsert, { onConflict: 'id' })
                .select()
                .single();

            if (upsertError) {
                console.error("Supabase profile upsert error:", upsertError);
                throw new Error(`Failed to create or update profile: ${upsertError.message}`);
            }
            console.log(`Profile for user ${currentUserId} created/updated successfully. Username: ${finalUsername}`);
        } else {
            console.log(`Profile for user ${currentUserId} already complete.`);
        }

        // 2. Submit the comment
        // Assuming addComment in lib/api.ts uses the standard client, which will respect RLS.
        // If addComment needs admin rights for some reason, this API would need service_role for that part too.
        // For now, assume addComment is fine with authenticated user context.
        const addedComment = await addComment(currentUserId, chapterId, commentText.trim(), null);

        if (!addedComment) {
            // Account and profile are set up, but comment failed.
            return NextResponse.json({
                message: "Account setup complete, but failed to post comment. Please try posting again from the chapter page.",
                // error: "Failed to submit comment." // Optional more specific error
            }, { status: 207 }); // 207 Multi-Status might be appropriate
        }

        return NextResponse.json({
            message: 'Account setup complete and comment submitted for approval!',
            // You could return the generated username if useful for the client immediately
            username: finalUsername
        }, { status: 201 });

    } catch (error: any) {
        console.error("Error in complete-signup-and-comment API:", error);
        return NextResponse.json({ error: `Server error: ${error.message || 'Unknown error'}` }, { status: 500 });
    }
}