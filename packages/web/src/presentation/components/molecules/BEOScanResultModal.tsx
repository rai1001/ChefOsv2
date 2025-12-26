import React, { useState } from 'react';
import { Button } from '@culinaryos/ui';
import { MenuScanResult } from '@culinaryos/core';

interface BEOScanResultModalProps {
  isOpen: boolean;
  onClose: () => void;
  scanResult: MenuScanResult;
  imageUrl: string;
}

/**
 * Modal to display BEO scan results and create event
 */
export const BEOScanResultModal: React.FC<BEOScanResultModalProps> = ({
  isOpen,
  onClose,
  scanResult,
  imageUrl,
}) => {
  const [isCreatingEvent, setIsCreatingEvent] = useState(false);
  const [eventCreated, setEventCreated] = useState(false);
  const [generateTasks, setGenerateTasks] = useState(true);
  const [generatePO, setGeneratePO] = useState(true);

  if (!isOpen) return null;

  const confidenceColor =
    scanResult.confidence >= 0.9
      ? 'text-green-600'
      : scanResult.confidence >= 0.7
        ? 'text-yellow-600'
        : 'text-red-600';

  const handleCreateEvent = async () => {
    setIsCreatingEvent(true);
    try {
      // TODO: Implement actual event creation
      // const createEventUseCase = container.get<CreateEventFromBEO>(TOKENS.CREATE_EVENT_FROM_BEO_USE_CASE);
      // const result = await createEventUseCase.execute({...});

      await new Promise((resolve) => setTimeout(resolve, 1500)); // Simulate API call
      setEventCreated(true);

      // TODO: If generateTasks, call GenerateProductionTasksFromEvent
      // TODO: If generatePO, call GeneratePurchaseOrderFromEvent
    } catch (error) {
      console.error('Error creating event:', error);
      alert('Failed to create event. Please try again.');
    } finally {
      setIsCreatingEvent(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Scan Results</h2>
              <p className="text-sm text-gray-600 mt-1">
                Review the extracted information and create your event
              </p>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {eventCreated ? (
            <div className="text-center py-12">
              <div className="mx-auto h-16 w-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                <svg
                  className="h-10 w-10 text-green-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Event Created Successfully!</h3>
              <p className="text-gray-600">
                Your event has been created
                {generateTasks && ' and production tasks have been generated'}
                {generatePO && ' along with the purchase order'}.
              </p>
              <div className="mt-6 space-x-3">
                <Button onClick={onClose}>Close</Button>
                <Button variant="secondary">View Event</Button>
              </div>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-6">
              {/* Image Preview */}
              <div>
                <h3 className="text-lg font-semibold mb-3">Original Document</h3>
                <img
                  src={imageUrl}
                  alt="BEO Document"
                  className="w-full rounded-lg border border-gray-200 shadow-sm"
                />
              </div>

              {/* Extracted Data */}
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold mb-3">Extracted Information</h3>
                  <div className="bg-gray-50 rounded-lg p-3 mb-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-gray-600">Confidence Score</span>
                      <span className={`text-lg font-bold ${confidenceColor}`}>
                        {(scanResult.confidence * 100).toFixed(0)}%
                      </span>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Event Name
                    </label>
                    <input
                      type="text"
                      defaultValue={scanResult.eventName}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Event Date
                      </label>
                      <input
                        type="date"
                        defaultValue={scanResult.eventDate?.toISOString().split('T')[0]}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Guests</label>
                      <input
                        type="number"
                        defaultValue={scanResult.numberOfGuests}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Menu Items
                    </label>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {scanResult.menuItems.map((item, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between p-2 bg-white border border-gray-200 rounded"
                        >
                          <span className="text-sm font-medium">{item.name}</span>
                          <span className="text-sm text-gray-600">{item.portions} portions</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {scanResult.dietaryRestrictions && scanResult.dietaryRestrictions.length > 0 && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Dietary Restrictions
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {scanResult.dietaryRestrictions.map((restriction, index) => (
                          <span
                            key={index}
                            className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded"
                          >
                            {restriction}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {scanResult.specialRequests && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Special Requests
                      </label>
                      <textarea
                        defaultValue={scanResult.specialRequests}
                        rows={2}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500 text-sm"
                      />
                    </div>
                  )}

                  <div className="border-t pt-4 mt-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Automation Options
                    </label>
                    <div className="space-y-2">
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={generateTasks}
                          onChange={(e) => setGenerateTasks(e.target.checked)}
                          className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                        />
                        <span className="ml-2 text-sm text-gray-700">
                          Generate Production Tasks
                        </span>
                      </label>
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={generatePO}
                          onChange={(e) => setGeneratePO(e.target.checked)}
                          className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                        />
                        <span className="ml-2 text-sm text-gray-700">Generate Purchase Order</span>
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {!eventCreated && (
          <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex justify-end space-x-3">
            <Button variant="secondary" onClick={onClose} disabled={isCreatingEvent}>
              Cancel
            </Button>
            <Button onClick={handleCreateEvent} disabled={isCreatingEvent}>
              {isCreatingEvent ? 'Creating Event...' : 'Create Event'}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};
