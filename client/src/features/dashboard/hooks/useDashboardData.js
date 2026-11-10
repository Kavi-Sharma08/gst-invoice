import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/features/auth';
import { invoicesApi } from '@/api/invoices.api';
import { customersApi } from '@/api/customers.api';

/**
 * Custom hook that handles Dashboard data fetching and auth gating.
 * Returns { invoices, customersCount, loading, error, reload }.
 */
export function useDashboardData() {
  const { isLoaded, isSignedIn } = useAuth();
  const [invoices, setInvoices] = useState([]);
  const [customersCount, setCustomersCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [invRes, custRes] = await Promise.all([
        invoicesApi.list({ limit: 100 }),
        customersApi.list({ limit: 1 }),
      ]);

      const invList = Array.isArray(invRes?.data) ? invRes.data : (invRes?.data?.invoices || []);
      const custTotal =
        custRes?.meta?.total ??
        custRes?.data?.total ??
        custRes?.pagination?.total ??
        (Array.isArray(custRes?.data) ? custRes.data.length : (custRes?.data?.customers?.length || 0));

      setInvoices(invList);
      setCustomersCount(custTotal);
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
      setError(err.message || 'Failed to load dashboard data. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isLoaded && isSignedIn) {
      loadData();
    } else if (isLoaded && !isSignedIn) {
      // Clerk has finished loading but user is not signed in — stop spinning
      setLoading(false);
    }
  }, [isLoaded, isSignedIn, loadData]);

  return {
    invoices,
    customersCount,
    loading,
    error,
    reload: loadData,
  };
}

export default useDashboardData;

