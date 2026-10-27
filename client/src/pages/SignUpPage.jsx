import React from 'react';
import { SignUp } from '@clerk/clerk-react';

export function SignUpPage() {
  return (
    <div className="min-h-[75vh] flex flex-col items-center justify-center py-10 px-4">
      <div className="text-center mb-6">
        <div className="inline-flex items-center justify-center w-11 h-11 rounded-xl bg-slate-900 text-white font-bold text-lg mb-2 shadow-sm">
          ₹
        </div>
        <h1 className="text-xl font-bold tracking-tight text-slate-900">Create your BillGST Account</h1>
        <p className="text-xs text-slate-500 mt-1">Get started with automated GST compliance and cloud backup</p>
      </div>

      <SignUp
        routing="path"
        path="/sign-up"
        signInUrl="/sign-in"
        afterSignUpUrl="/dashboard"
        appearance={{
          variables: {
            colorPrimary: '#0f172a',
            colorText: '#1e293b',
            colorBackground: '#ffffff',
            borderRadius: '0.75rem'
          },
          elements: {
            card: 'shadow-sm border border-slate-200/90'
          }
        }}
      />
    </div>
  );
}

export default SignUpPage;
