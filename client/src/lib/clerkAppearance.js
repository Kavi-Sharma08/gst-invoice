import { dark } from '@clerk/themes';

/**
 * Shared Clerk appearance configuration.
 * Uses Clerk's dark base theme with customized variables and element styles
 * to match BillGST's dark design tokens across SignIn, SignUp, and UserButton.
 */
export const clerkAppearance = {
  baseTheme: dark,
  variables: {
    colorPrimary: '#4F46E5',
    colorBackground: '#111113',
    colorText: '#F5F5F7',
    colorTextSecondary: '#A1A1AA',
    colorInputBackground: '#09090B',
    colorInputText: '#FAFAFA',
    colorNeutral: '#FAFAFA',
    borderRadius: '0.75rem',
  },
  elements: {
    card: 'shadow-sm border border-[#27272A] bg-[#111113]',
    socialButtonsBlockButton: {
      color: '#F5F5F7',
      borderColor: 'rgba(255, 255, 255, 0.15)',
    },
    socialButtonsBlockButtonText: {
      color: '#F5F5F7',
      fontWeight: 500,
    },
  },
};

export default clerkAppearance;

