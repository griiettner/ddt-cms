/**
 * Settings Header Component
 */
import { ReleaseSelector } from '@/components/common';

function SettingsHeader(): JSX.Element {
  return (
    <div className="mb-6 flex items-center justify-between">
      <div>
        <h1 className="text-3xl font-bold text-co-gray-900">Settings</h1>
        <p className="mt-1 text-co-gray-600">Configure element types and test actions</p>
      </div>
      <ReleaseSelector className="w-48" />
    </div>
  );
}

export default SettingsHeader;
