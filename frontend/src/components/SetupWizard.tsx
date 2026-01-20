import React, { useState } from 'react';
import { setupAPI, SetupData } from '../api/setup.api';
import { useAuthStore } from '../stores/auth.store';

interface SetupWizardProps {
  onComplete: () => void;
}

type Step = 'welcome' | 'family' | 'admin' | 'integrations' | 'review';

const SetupWizard: React.FC<SetupWizardProps> = ({ onComplete }) => {
  const { setAuth } = useAuthStore();
  const [currentStep, setCurrentStep] = useState<Step>('welcome');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form data state
  const [formData, setFormData] = useState<SetupData>({
    familyName: '',
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
    adminEmail: '',
    adminPassword: '',
    adminFirstName: '',
    adminLastName: '',
    weatherApiKey: '',
    weatherLocation: '',
    weatherUnits: 'metric',
    woocommerceStoreUrl: '',
    woocommerceConsumerKey: '',
    woocommerceConsumerSecret: '',
  });

  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [emailValid, setEmailValid] = useState(false);

  const steps: Step[] = ['welcome', 'family', 'admin', 'integrations', 'review'];
  const currentStepIndex = steps.indexOf(currentStep);

  const validateEmail = async (email: string) => {
    if (!email) return false;
    try {
      const result = await setupAPI.validateEmail(email);
      setEmailValid(result.available);
      if (!result.available) {
        setError('This email is already in use');
      }
      return result.available;
    } catch (err) {
      return false;
    }
  };

  const handleNext = async () => {
    setError(null);

    // Validation per step
    if (currentStep === 'family') {
      if (!formData.familyName.trim()) {
        setError('Please enter a family name');
        return;
      }
    }

    if (currentStep === 'admin') {
      if (!formData.adminEmail || !formData.adminPassword || !formData.adminFirstName || !formData.adminLastName) {
        setError('Please fill in all fields');
        return;
      }
      if (formData.adminPassword.length < 8) {
        setError('Password must be at least 8 characters');
        return;
      }
      if (formData.adminPassword !== passwordConfirm) {
        setError('Passwords do not match');
        return;
      }
      const isEmailValid = await validateEmail(formData.adminEmail);
      if (!isEmailValid) {
        return;
      }
    }

    const nextIndex = currentStepIndex + 1;
    if (nextIndex < steps.length) {
      setCurrentStep(steps[nextIndex]);
    }
  };

  const handleBack = () => {
    const prevIndex = currentStepIndex - 1;
    if (prevIndex >= 0) {
      setCurrentStep(steps[prevIndex]);
      setError(null);
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setError(null);

    try {
      const response = await setupAPI.initialize(formData);

      // Save auth tokens
      setAuth(response.user, response.tokens);

      // Complete setup
      onComplete();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Setup failed. Please try again.');
      setIsSubmitting(false);
    }
  };

  const renderProgress = () => (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-2">
        {steps.map((step, index) => (
          <div key={step} className="flex items-center flex-1">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-all ${
                index <= currentStepIndex
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-200 text-slate-500'
              }`}
            >
              {index < currentStepIndex ? (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                index + 1
              )}
            </div>
            {index < steps.length - 1 && (
              <div
                className={`flex-1 h-1 mx-2 transition-all ${
                  index < currentStepIndex ? 'bg-indigo-600' : 'bg-slate-200'
                }`}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );

  const renderWelcome = () => (
    <div className="text-center">
      <div className="w-20 h-20 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg">
        <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M13 10V3L4 14h7v7l9-11h-7z"
          />
        </svg>
      </div>
      <h1 className="text-4xl font-bold text-slate-900 mb-4">Welcome to Lumina</h1>
      <p className="text-lg text-slate-600 mb-8 max-w-2xl mx-auto">
        Your family's central hub for orders, calendar, photos, and more.
        Let's get you set up in just a few steps.
      </p>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-3xl mx-auto mb-8">
        <div className="bg-white border border-slate-200 rounded-xl p-6">
          <div className="w-12 h-12 bg-emerald-100 rounded-lg flex items-center justify-center mx-auto mb-3">
            <svg className="w-6 h-6 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          </div>
          <h3 className="font-semibold text-slate-900 mb-1">Family First</h3>
          <p className="text-sm text-slate-600">Create your family and invite members</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-6">
          <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center mx-auto mb-3">
            <svg className="w-6 h-6 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <h3 className="font-semibold text-slate-900 mb-1">Connect</h3>
          <p className="text-sm text-slate-600">Integrate with your favorite tools</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-6">
          <div className="w-12 h-12 bg-amber-100 rounded-lg flex items-center justify-center mx-auto mb-3">
            <svg className="w-6 h-6 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
            </svg>
          </div>
          <h3 className="font-semibold text-slate-900 mb-1">Launch</h3>
          <p className="text-sm text-slate-600">Start organizing your family life</p>
        </div>
      </div>
      <button
        onClick={handleNext}
        className="px-8 py-3 bg-gradient-to-r from-indigo-500 to-indigo-600 text-white font-medium rounded-lg hover:from-indigo-600 hover:to-indigo-700 transition-all shadow-md hover:shadow-lg"
      >
        Get Started
      </button>
    </div>
  );

  const renderFamily = () => (
    <div>
      <h2 className="text-3xl font-bold text-slate-900 mb-2">Create Your Family</h2>
      <p className="text-slate-600 mb-8">Give your family a name that everyone will recognize</p>

      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Family Name *
          </label>
          <input
            type="text"
            value={formData.familyName}
            onChange={(e) => setFormData({ ...formData, familyName: e.target.value })}
            placeholder="e.g., The Smiths, Johnson Family, Our Home"
            className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-lg"
            autoFocus
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Timezone
          </label>
          <select
            value={formData.timezone}
            onChange={(e) => setFormData({ ...formData, timezone: e.target.value })}
            className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="America/New_York">Eastern Time (US)</option>
            <option value="America/Chicago">Central Time (US)</option>
            <option value="America/Denver">Mountain Time (US)</option>
            <option value="America/Los_Angeles">Pacific Time (US)</option>
            <option value="Europe/London">London</option>
            <option value="Europe/Paris">Paris</option>
            <option value="Asia/Tokyo">Tokyo</option>
            <option value="Australia/Sydney">Sydney</option>
            <option value="UTC">UTC</option>
          </select>
        </div>
      </div>
    </div>
  );

  const renderAdmin = () => (
    <div>
      <h2 className="text-3xl font-bold text-slate-900 mb-2">Create Admin Account</h2>
      <p className="text-slate-600 mb-8">You'll be the family administrator with full access</p>

      <div className="space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              First Name *
            </label>
            <input
              type="text"
              value={formData.adminFirstName}
              onChange={(e) => setFormData({ ...formData, adminFirstName: e.target.value })}
              className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              autoFocus
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Last Name *
            </label>
            <input
              type="text"
              value={formData.adminLastName}
              onChange={(e) => setFormData({ ...formData, adminLastName: e.target.value })}
              className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Email Address *
          </label>
          <input
            type="email"
            value={formData.adminEmail}
            onChange={(e) => setFormData({ ...formData, adminEmail: e.target.value })}
            onBlur={(e) => e.target.value && validateEmail(e.target.value)}
            className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Password *
          </label>
          <input
            type="password"
            value={formData.adminPassword}
            onChange={(e) => setFormData({ ...formData, adminPassword: e.target.value })}
            className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <p className="text-xs text-slate-500 mt-1">Minimum 8 characters</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Confirm Password *
          </label>
          <input
            type="password"
            value={passwordConfirm}
            onChange={(e) => setPasswordConfirm(e.target.value)}
            className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </div>
    </div>
  );

  const renderIntegrations = () => (
    <div>
      <h2 className="text-3xl font-bold text-slate-900 mb-2">Connect Integrations</h2>
      <p className="text-slate-600 mb-8">Optional: Configure integrations now or do it later in Settings</p>

      <div className="space-y-6">
        {/* Weather */}
        <div className="bg-white border border-slate-200 rounded-xl p-6">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-10 h-10 bg-sky-100 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-sky-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
              </svg>
            </div>
            <div>
              <h3 className="font-semibold text-slate-900">Weather Widget</h3>
              <p className="text-sm text-slate-600">OpenWeatherMap API</p>
            </div>
          </div>
          <div className="space-y-3">
            <input
              type="text"
              value={formData.weatherApiKey}
              onChange={(e) => setFormData({ ...formData, weatherApiKey: e.target.value })}
              placeholder="API Key (optional)"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
            />
            <input
              type="text"
              value={formData.weatherLocation}
              onChange={(e) => setFormData({ ...formData, weatherLocation: e.target.value })}
              placeholder="Location (e.g., London, New York)"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
            />
          </div>
        </div>

        {/* WooCommerce */}
        <div className="bg-white border border-slate-200 rounded-xl p-6">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
            </div>
            <div>
              <h3 className="font-semibold text-slate-900">WooCommerce Orders</h3>
              <p className="text-sm text-slate-600">Connect your store</p>
            </div>
          </div>
          <div className="space-y-3">
            <input
              type="url"
              value={formData.woocommerceStoreUrl}
              onChange={(e) => setFormData({ ...formData, woocommerceStoreUrl: e.target.value })}
              placeholder="Store URL (optional)"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
            />
            <input
              type="text"
              value={formData.woocommerceConsumerKey}
              onChange={(e) => setFormData({ ...formData, woocommerceConsumerKey: e.target.value })}
              placeholder="Consumer Key"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
            />
            <input
              type="password"
              value={formData.woocommerceConsumerSecret}
              onChange={(e) => setFormData({ ...formData, woocommerceConsumerSecret: e.target.value })}
              placeholder="Consumer Secret"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
            />
          </div>
        </div>

        <p className="text-sm text-slate-500 italic">
          You can skip this step and configure integrations later in Settings
        </p>
      </div>
    </div>
  );

  const renderReview = () => (
    <div>
      <h2 className="text-3xl font-bold text-slate-900 mb-2">Review & Launch</h2>
      <p className="text-slate-600 mb-8">Confirm your settings before launching Lumina</p>

      <div className="space-y-4">
        <div className="bg-white border border-slate-200 rounded-xl p-6">
          <h3 className="font-semibold text-slate-900 mb-3">Family Details</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-600">Family Name:</span>
              <span className="text-slate-900 font-medium">{formData.familyName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">Timezone:</span>
              <span className="text-slate-900 font-medium">{formData.timezone}</span>
            </div>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-6">
          <h3 className="font-semibold text-slate-900 mb-3">Admin Account</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-600">Name:</span>
              <span className="text-slate-900 font-medium">{formData.adminFirstName} {formData.adminLastName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">Email:</span>
              <span className="text-slate-900 font-medium">{formData.adminEmail}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">Role:</span>
              <span className="px-2 py-1 bg-indigo-100 text-indigo-700 text-xs font-medium rounded-full">Admin</span>
            </div>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-6">
          <h3 className="font-semibold text-slate-900 mb-3">Integrations</h3>
          <div className="space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-slate-600">Weather Widget:</span>
              <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                formData.weatherApiKey ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'
              }`}>
                {formData.weatherApiKey ? 'Configured' : 'Not configured'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-600">WooCommerce:</span>
              <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                formData.woocommerceStoreUrl ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'
              }`}>
                {formData.woocommerceStoreUrl ? 'Configured' : 'Not configured'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-emerald-50 flex items-center justify-center p-4">
      <div className="w-full max-w-3xl">
        {currentStep !== 'welcome' && renderProgress()}

        <div className="bg-white rounded-2xl shadow-xl p-8 md:p-12 border border-slate-200">
          {currentStep === 'welcome' && renderWelcome()}
          {currentStep === 'family' && renderFamily()}
          {currentStep === 'admin' && renderAdmin()}
          {currentStep === 'integrations' && renderIntegrations()}
          {currentStep === 'review' && renderReview()}

          {error && (
            <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          {currentStep !== 'welcome' && (
            <div className="mt-8 flex items-center justify-between">
              <button
                onClick={handleBack}
                disabled={isSubmitting}
                className="px-6 py-3 text-slate-700 font-medium hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-50"
              >
                Back
              </button>

              {currentStep !== 'review' ? (
                <button
                  onClick={handleNext}
                  disabled={isSubmitting}
                  className="px-8 py-3 bg-gradient-to-r from-indigo-500 to-indigo-600 text-white font-medium rounded-lg hover:from-indigo-600 hover:to-indigo-700 transition-all shadow-md hover:shadow-lg disabled:opacity-50"
                >
                  Continue
                </button>
              ) : (
                <button
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className="px-8 py-3 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white font-medium rounded-lg hover:from-emerald-600 hover:to-emerald-700 transition-all shadow-md hover:shadow-lg disabled:opacity-50 flex items-center space-x-2"
                >
                  {isSubmitting ? (
                    <>
                      <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      <span>Launching...</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                      </svg>
                      <span>Launch Lumina</span>
                    </>
                  )}
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SetupWizard;
