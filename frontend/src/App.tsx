import React, { useState, useEffect, Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useSearchParams, useNavigate } from 'react-router-dom';
import { useAuthStore } from './stores/auth.store';
import { useSettingsStore } from './stores/settings.store';
import { useFeatures } from './hooks/useFeatures';
import Login from './components/Login';
import Layout from './components/Layout';

// Lazy load components for better performance
const Calendar = lazy(() => import('./components/Calendar'));
const PhotoGallery = lazy(() => import('./components/PhotoGallery'));
const OrdersSidebar = lazy(() => import('./components/OrdersSidebar'));
const Kiosk = lazy(() => import('./components/Kiosk'));
const UserProfile = lazy(() => import('./components/UserProfile'));
const SetupWizard = lazy(() => import('./components/SetupWizard'));
const WorkflowBoard = lazy(() => import('./components/workflow/WorkflowBoard'));

// Loading fallback component
const LoadingFallback: React.FC = () => (
  <div className="flex items-center justify-center h-full">
    <div className="text-center">
      <div className="w-12 h-12 mx-auto mb-4 rounded-full border-4 border-slate-200 border-t-indigo-600 animate-spin"></div>
      <p className="text-slate-600 text-sm">Loading...</p>
    </div>
  </div>
);

// Authenticated Dashboard Content (only loads after auth check)
const DashboardContent: React.FC<{
  onError: (error: string) => void;
}> = ({ onError }) => {
  const { features } = useFeatures();
  const [currentView, setCurrentView] = useState<'calendar' | 'photos' | 'workflow'>('calendar');

  const handleViewChange = (view: string) => {
    if (view === 'calendar' || view === 'photos' || view === 'workflow') {
      setCurrentView(view);
    }
  };

  // Only show orders sidebar if WooCommerce is enabled
  const showOrdersSidebar = currentView === 'calendar' && features?.workflow?.enabled;

  return (
    <Layout
      onLogout={() => {}}
      onError={onError}
      sidebar={
        showOrdersSidebar ? (
          <Suspense fallback={<LoadingFallback />}>
            <OrdersSidebar onError={onError} />
          </Suspense>
        ) : undefined
      }
      currentView={currentView}
      onViewChange={handleViewChange}
    >
      <Suspense fallback={<LoadingFallback />}>
        {currentView === 'calendar' ? (
          <Calendar onError={onError} />
        ) : currentView === 'photos' ? (
          <PhotoGallery onError={onError} />
        ) : (
          <WorkflowBoard />
        )}
      </Suspense>
    </Layout>
  );
};

// Main Dashboard Component
const Dashboard: React.FC = () => {
  const { isAuthenticated } = useAuthStore();
  const { loadSettings, isInitialized } = useSettingsStore();
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [checkingSetup, setCheckingSetup] = useState(true);

  // Check if setup is needed on mount
  useEffect(() => {
    const checkSetup = async () => {
      try {
        const { setupAPI } = await import('./api/setup.api');
        const status = await setupAPI.getStatus();
        if (status.setupNeeded) {
          navigate('/setup');
        }
      } catch (error) {
        console.error('Setup check error:', error);
      } finally {
        setCheckingSetup(false);
      }
    };
    checkSetup();
  }, [navigate]);

  // Check for kiosk mode via query parameter
  useEffect(() => {
    if (searchParams.get('kiosk') === 'true') {
      navigate('/kiosk');
    }
  }, [searchParams, navigate]);

  // Load settings when user is authenticated
  useEffect(() => {
    if (isAuthenticated && !isInitialized) {
      loadSettings();
    }
  }, [isAuthenticated, isInitialized, loadSettings]);

  const handleLoginSuccess = () => {
    setErrorMessage('');
    loadSettings();
  };

  const handleLogout = () => {
    setErrorMessage('');
  };

  const handleError = (error: string) => {
    setErrorMessage(error);
  };

  if (checkingSetup) {
    return <LoadingFallback />;
  }

  if (!isAuthenticated) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <>
      {errorMessage && (
        <div className="mb-4 rounded-xl bg-red-50 border border-red-200 p-4">
          <div className="flex items-start space-x-3">
            <svg className="w-5 h-5 text-red-600 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <h3 className="text-sm font-medium text-red-800">Error</h3>
              <p className="text-sm text-red-700 mt-1">{errorMessage}</p>
            </div>
          </div>
        </div>
      )}
      <DashboardContent onError={handleError} />
    </>
  );
};

// Kiosk Mode Wrapper with Auth Check
const KioskMode: React.FC = () => {
  const { isAuthenticated } = useAuthStore();
  const { loadSettings, isInitialized } = useSettingsStore();
  const [errorMessage, setErrorMessage] = useState<string>('');

  // Load settings when user is authenticated
  useEffect(() => {
    if (isAuthenticated && !isInitialized) {
      loadSettings();
    }
  }, [isAuthenticated, isInitialized, loadSettings]);

  const handleLoginSuccess = () => {
    setErrorMessage('');
    loadSettings();
  };

  const handleError = (error: string) => {
    setErrorMessage(error);
  };

  if (!isAuthenticated) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <Suspense fallback={<LoadingFallback />}>
      <Kiosk onError={handleError} />
    </Suspense>
  );
};

// Protected Route for Profile
const ProfilePage: React.FC = () => {
  const { isAuthenticated } = useAuthStore();
  const { loadSettings, isInitialized } = useSettingsStore();

  useEffect(() => {
    if (isAuthenticated && !isInitialized) {
      loadSettings();
    }
  }, [isAuthenticated, isInitialized, loadSettings]);

  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return (
    <Suspense fallback={<LoadingFallback />}>
      <UserProfile />
    </Suspense>
  );
};

// Setup Wizard Page
const SetupPage: React.FC = () => {
  const navigate = useNavigate();

  const handleSetupComplete = () => {
    // Redirect to dashboard after setup completion
    navigate('/');
  };

  return (
    <Suspense fallback={<LoadingFallback />}>
      <SetupWizard onComplete={handleSetupComplete} />
    </Suspense>
  );
};

// Main App with Routing
function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/setup" element={<SetupPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/kiosk" element={<KioskMode />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
