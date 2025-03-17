// src/app/admin/translator/page.tsx
import React from 'react';
import { Metadata } from 'next';
import AdminRoleCheck from '@/components/auth/admin-role-check';
import NovelTranslator from '@/components/novel-translator';

export const metadata: Metadata = {
  title: 'Novel Translator | Admin',
  description: 'Korean to English novel translation tool',
};

/**
 * Page component for the novel translator
 * Protected by AdminRoleCheck to ensure only admins and authors can access
 */
export default function NovelTranslatorPage() {
  return (
    <AdminRoleCheck allowAuthor={true}>
      <div className="h-[calc(100vh-64px)]">
        <NovelTranslator />
      </div>
    </AdminRoleCheck>
  );
}