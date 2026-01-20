/**
 * Settings Header Component
 */
import { ReleaseSelector } from '../../../components/common';

function SettingsHeader() {
  return (
    <div className="flex items-center justify-between mb-6">
      <div>
        <h1 className="text-3xl font-bold text-co-gray-900">Settings</h1>
        <p className="text-co-gray-600 mt-1">Configure element types and test actions</p>
      </div>
      <ReleaseSelector className="w-48" />
    </div>
  );
}

export default SettingsHeader;
