'use client';

import { useState, useEffect } from 'react';
import { useTheme } from '@/providers/theme-provider';
import { supabase } from '@/lib/supabase';

interface Application {
  id: string;
  name: string;
  email: string;
  bio: string;
}

export default function AuthorApprovalsPage() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [applications, setApplications] = useState<Application[]>([]);

  useEffect(() => {
    fetchApplications();
  }, []);

  async function fetchApplications() {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, name, email, bio')
      .eq('role', 'user')
      .is('approved', null);

    if (error) {
      console.error('Error fetching author applications:', error);
    } else {
      setApplications(data as Application[]);
    }
  }

  async function approveApplication(userId: string) {
    const { error } = await supabase
      .from('profiles')
      .update({ role: 'author', approved: true })
      .eq('id', userId);

    if (error) {
      console.error('Error approving author application:', error);
    } else {
      fetchApplications();
    }
  }

  async function rejectApplication(userId: string) {
    const { error } = await supabase
      .from('profiles')
      .update({ approved: false })
      .eq('id', userId);

    if (error) {
      console.error('Error rejecting author application:', error);
    } else {
      fetchApplications();
    }
  }

  return (
    <div className={`min-h-screen ${isDark ? 'bg-gray-900' : 'bg-gray-50'}`}>
      <div className="container mx-auto px-4 py-16">
        <h1 className={`text-3xl font-bold mb-8 ${isDark ? 'text-white' : 'text-gray-900'}`}>
          Author Applications
        </h1>
        {applications.length === 0 ? (
          <p className={isDark ? 'text-gray-400' : 'text-gray-600'}>No pending applications.</p>
        ) : (
          <ul className="space-y-4">
            {applications.map((application: Application) => (
              <li key={application.id} className={`p-4 rounded-md ${isDark ? 'bg-gray-800' : 'bg-white'} shadow`}>
                <div className="flex justify-between items-center">
                  <div>
                    <h2 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{application.name}</h2>
                    <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>{application.email}</p>
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => approveApplication(application.id)}
                      className="px-4 py-2 rounded-md bg-green-600 text-white hover:bg-green-700"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => rejectApplication(application.id)}
                      className="px-4 py-2 rounded-md bg-red-600 text-white hover:bg-red-700"
                    >
                      Reject
                    </button>
                  </div>
                </div>
                <p className={`mt-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>{application.bio}</p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}