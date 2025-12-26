import React, { useState } from 'react';
import { Button, Card, CardContent } from '@culinaryos/ui';
import { MenuScanResult } from '@culinaryos/core';
import { BEOScanResultModal } from '../components/molecules/BEOScanResultModal';

/**
 * BEO Scanner Page
 *
 * Permite escanear documentos BEO con IA y crear eventos automáticamente
 */
export const BEOScannerPage: React.FC = () => {
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<MenuScanResult | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);

      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleScan = async () => {
    if (!selectedFile) return;

    setIsScanning(true);
    try {
      // TODO: Implement actual AI service call
      // const aiService = container.get<IAIService>(TOKENS.AI_SERVICE);
      // const result = await aiService.scanMenu(imageUrl);

      // Mock result for demonstration
      const mockResult: MenuScanResult = {
        eventName: 'Wedding Reception - Smith Family',
        eventDate: new Date('2025-06-15'),
        numberOfGuests: 150,
        menuItems: [
          { name: 'Caesar Salad', portions: 150 },
          { name: 'Grilled Salmon', portions: 100 },
          { name: 'Beef Tenderloin', portions: 50 },
          { name: 'Chocolate Cake', portions: 150 },
        ],
        dietaryRestrictions: ['Vegetarian', 'Gluten-Free'],
        specialRequests: 'Late night pizza station at 11 PM',
        confidence: 0.92,
      };

      setScanResult(mockResult);
    } catch (error) {
      console.error('Error scanning BEO:', error);
      alert('Error scanning document. Please try again.');
    } finally {
      setIsScanning(false);
    }
  };

  const handleCloseModal = () => {
    setScanResult(null);
  };

  const handleReset = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setScanResult(null);
  };

  return (
    <div className="container mx-auto p-6 max-w-5xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">BEO Scanner</h1>
        <p className="text-gray-600">
          Upload a Banquet Event Order to automatically create events, production tasks, and
          purchase orders
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Upload Section */}
        <Card>
          <CardContent className="p-6">
            <h2 className="text-xl font-semibold mb-4">Upload BEO Document</h2>

            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
              {previewUrl ? (
                <div className="space-y-4">
                  <img
                    src={previewUrl}
                    alt="BEO Preview"
                    className="max-h-64 mx-auto rounded shadow-md"
                  />
                  <div className="flex gap-2 justify-center">
                    <Button variant="secondary" size="sm" onClick={handleReset}>
                      Change File
                    </Button>
                    <Button onClick={handleScan} disabled={isScanning} size="sm">
                      {isScanning ? 'Scanning...' : 'Scan Document'}
                    </Button>
                  </div>
                </div>
              ) : (
                <div>
                  <svg
                    className="mx-auto h-12 w-12 text-gray-400"
                    stroke="currentColor"
                    fill="none"
                    viewBox="0 0 48 48"
                  >
                    <path
                      d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                      strokeWidth={2}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  <div className="mt-4">
                    <label className="cursor-pointer">
                      <span className="mt-2 block text-sm font-medium text-gray-900">
                        Click to upload
                      </span>
                      <span className="mt-1 block text-xs text-gray-500">
                        PNG, JPG, PDF up to 10MB
                      </span>
                      <input
                        type="file"
                        className="hidden"
                        accept="image/*,.pdf"
                        onChange={handleFileSelect}
                      />
                    </label>
                  </div>
                </div>
              )}
            </div>

            {selectedFile && (
              <div className="mt-4 text-sm text-gray-600">
                <strong>File:</strong> {selectedFile.name}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Instructions */}
        <Card>
          <CardContent className="p-6">
            <h2 className="text-xl font-semibold mb-4">How it works</h2>

            <ol className="space-y-3 text-sm text-gray-700">
              <li className="flex items-start">
                <span className="flex items-center justify-center w-6 h-6 bg-primary-500 text-white rounded-full mr-3 flex-shrink-0">
                  1
                </span>
                <span>
                  <strong>Upload</strong> a BEO document (photo or PDF)
                </span>
              </li>
              <li className="flex items-start">
                <span className="flex items-center justify-center w-6 h-6 bg-primary-500 text-white rounded-full mr-3 flex-shrink-0">
                  2
                </span>
                <span>
                  <strong>AI scans</strong> the document and extracts event details
                </span>
              </li>
              <li className="flex items-start">
                <span className="flex items-center justify-center w-6 h-6 bg-primary-500 text-white rounded-full mr-3 flex-shrink-0">
                  3
                </span>
                <span>
                  <strong>Review</strong> extracted data and make adjustments
                </span>
              </li>
              <li className="flex items-start">
                <span className="flex items-center justify-center w-6 h-6 bg-primary-500 text-white rounded-full mr-3 flex-shrink-0">
                  4
                </span>
                <span>
                  <strong>Generate</strong> event, production tasks, and purchase orders
                  automatically
                </span>
              </li>
            </ol>

            <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h3 className="font-semibold text-blue-900 mb-1">Pro Tips</h3>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• Ensure the document is clear and well-lit</li>
                <li>• Make sure menu items are visible</li>
                <li>• Check that dates and guest counts are readable</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Scans */}
      <Card className="mt-6">
        <CardContent className="p-6">
          <h2 className="text-xl font-semibold mb-4">Recent Scans</h2>
          <div className="text-gray-500 text-center py-8 border border-dashed rounded">
            No recent scans. Upload your first BEO to get started!
          </div>
        </CardContent>
      </Card>

      {/* Scan Result Modal */}
      {scanResult && (
        <BEOScanResultModal
          isOpen={!!scanResult}
          onClose={handleCloseModal}
          scanResult={scanResult}
          imageUrl={previewUrl || ''}
        />
      )}
    </div>
  );
};
