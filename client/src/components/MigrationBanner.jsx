import { useState, useEffect } from 'react';
import { CloudUpload, Download, CheckCircle2, AlertCircle, X, Loader2 } from 'lucide-react';
import { migrationService } from '../services/migration.service.js';
import { useAuth } from '../context/AuthContext.jsx';
import { Button } from './ui/Button.jsx';

export function MigrationBanner({ onMigrationSuccess }) {
  const { isAuthenticated } = useAuth();
  const [shouldShow, setShouldShow] = useState(false);
  const [summary, setSummary] = useState(null);
  const [status, setStatus] = useState('idle'); // 'idle' | 'migrating' | 'success' | 'error'
  const [resultMessage, setResultMessage] = useState('');

  useEffect(() => {
    let mounted = true;
    async function check() {
      if (!isAuthenticated || migrationService.isCompleted() || migrationService.isDismissed()) {
        if (mounted) setShouldShow(false);
        return;
      }

      const hasData = await migrationService.hasLocalData();
      if (hasData && mounted) {
        const counts = await migrationService.getLocalDataSummary();
        setSummary(counts);
        setShouldShow(true);
      }
    }

    check();
    return () => {
      mounted = false;
    };
  }, [isAuthenticated]);

  if (!shouldShow) return null;

  const handleDismiss = () => {
    migrationService.dismiss();
    setShouldShow(false);
  };

  const handleMigrate = async () => {
    setStatus('migrating');
    try {
      const result = await migrationService.migrateToCloud();
      setStatus('success');
      setResultMessage(
        `Synced successfully: ${result?.invoices?.imported || 0} invoices, ${result?.customers?.imported || 0} customers, ${result?.products?.imported || 0} items.`
      );
      if (onMigrationSuccess) onMigrationSuccess();
      setTimeout(() => {
        setShouldShow(false);
      }, 5000);
    } catch (err) {
      setStatus('error');
      setResultMessage(err.message || 'Failed to migrate local data. Please try again.');
    }
  };

  const handleDownloadBackup = async () => {
    try {
      await migrationService.downloadBackup();
    } catch {
      // Handled in service
    }
  };

  return (
    <div className="bg-gradient-to-r from-amber-50 to-orange-50 border-b border-amber-200 px-4 py-3 text-slate-800 transition-all no-print">
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-3 text-xs">
        <div className="flex items-start gap-2.5">
          <div className="p-1.5 bg-amber-100 rounded-lg text-amber-800 shrink-0 mt-0.5 md:mt-0">
            <CloudUpload className="w-4 h-4" />
          </div>
          <div>
            <span className="font-semibold text-amber-950">
              Offline data detected in browser storage
            </span>
            <p className="text-amber-800/90 text-[11px] mt-0.5">
              {summary
                ? `Found ${summary.invoices} invoices, ${summary.customers} customers, and ${summary.products} products stored in your browser. Sync them safely to your cloud account.`
                : 'Sync your local browser invoices to your cloud account.'}
            </p>
            {status === 'success' && (
              <p className="text-emerald-700 font-medium flex items-center gap-1 mt-1 text-[11px]">
                <CheckCircle2 className="w-3.5 h-3.5" />
                {resultMessage}
              </p>
            )}
            {status === 'error' && (
              <p className="text-rose-600 font-medium flex items-center gap-1 mt-1 text-[11px]">
                <AlertCircle className="w-3.5 h-3.5" />
                {resultMessage}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 self-end md:self-auto shrink-0">
          <Button
            size="sm"
            variant="outline"
            onClick={handleDownloadBackup}
            disabled={status === 'migrating'}
            className="text-[11px] h-7 bg-white/80 border-amber-300 text-amber-900 hover:bg-amber-100"
          >
            <Download className="w-3 h-3 mr-1" />
            Backup First
          </Button>

          <Button
            size="sm"
            onClick={handleMigrate}
            disabled={status === 'migrating' || status === 'success'}
            className="text-[11px] h-7 bg-amber-800 hover:bg-amber-900 text-white"
          >
            {status === 'migrating' ? (
              <>
                <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                Syncing...
              </>
            ) : status === 'success' ? (
              <>
                <CheckCircle2 className="w-3 h-3 mr-1" />
                Synced
              </>
            ) : (
              <>
                <CloudUpload className="w-3 h-3 mr-1" />
                Sync to Cloud
              </>
            )}
          </Button>

          <button
            onClick={handleDismiss}
            className="p-1 text-slate-400 hover:text-slate-600 rounded cursor-pointer"
            title="Dismiss"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
