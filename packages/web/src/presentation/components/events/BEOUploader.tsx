import React, { useState } from 'react';
import { useStore } from '@/presentation/store/useStore';
import { getStorage, ref, uploadBytesResumable } from 'firebase/storage';
import { Upload, CheckCircle, Loader2, AlertCircle } from 'lucide-react';
// import { useDropzone } from 'react-dropzone'; // If not installed, we'll use standard input

export const BEOUploader: React.FC = () => {
  const { activeOutletId, currentUser } = useStore();
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>(
    'idle'
  );
  const [fileName, setFileName] = useState('');

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      alert('Solo se permiten archivos PDF');
      return;
    }

    setIsUploading(true);
    setUploadStatus('uploading');
    setFileName(file.name);

    try {
      const storage = getStorage();
      // Path must match the trigger: uploads/beo/{id}
      const storageRef = ref(storage, `uploads/beo/${Date.now()}_${file.name}`);

      const metadata = {
        customMetadata: {
          outletId: activeOutletId || '',
          uploadedBy: currentUser?.id || '',
        },
      };

      const uploadTask = uploadBytesResumable(storageRef, file, metadata);

      uploadTask.on(
        'state_changed',
        (_snapshot) => {
          // Progress...
        },
        (error) => {
          console.error('Upload error:', error);
          setUploadStatus('error');
          setIsUploading(false);
        },
        () => {
          setUploadStatus('success');
          setIsUploading(false);
          // Trigger backend processing automatically via Cloud Function
        }
      );
    } catch (error) {
      console.error('Upload failed:', error);
      setUploadStatus('error');
      setIsUploading(false);
    }
  };

  return (
    <div className="premium-glass p-6 rounded-2xl border border-dashed border-white/20 hover:border-primary/50 transition-colors relative group">
      <input
        type="file"
        accept=".pdf"
        onChange={handleFileUpload}
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
        disabled={isUploading}
      />

      <div className="flex flex-col items-center justify-center text-center space-y-3 z-10 relative pointer-events-none">
        <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center group-hover:bg-primary/10 transition-colors">
          {uploadStatus === 'idle' && (
            <Upload className="w-8 h-8 text-slate-400 group-hover:text-primary transition-colors" />
          )}
          {uploadStatus === 'uploading' && (
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
          )}
          {uploadStatus === 'success' && <CheckCircle className="w-8 h-8 text-emerald-400" />}
          {uploadStatus === 'error' && <AlertCircle className="w-8 h-8 text-red-400" />}
        </div>

        <div>
          <h3 className="font-bold text-white text-lg">
            {uploadStatus === 'success' ? 'BEO Subido Correctamente' : 'Importar Evento (BEO)'}
          </h3>
          <p className="text-sm text-slate-400 max-w-xs mx-auto mt-1">
            {uploadStatus === 'idle' &&
              'Arrastra tu PDF aquí o haz clic para subir. La IA detectará fecha, pax y menús.'}
            {uploadStatus === 'uploading' && `Subiendo ${fileName}...`}
            {uploadStatus === 'success' &&
              "La IA está procesando el documento. Aparecerá en 'Eventos' en breve."}
            {uploadStatus === 'error' && 'Error al subir. Inténtalo de nuevo.'}
          </p>
        </div>
      </div>

      {uploadStatus === 'success' && (
        <div className="absolute top-2 right-2 z-30">
          <button
            onClick={(e) => {
              e.preventDefault();
              setUploadStatus('idle');
            }}
            className="p-1 hover:bg-white/10 rounded-full"
          >
            <AlertCircle size={16} className="text-slate-500 hover:text-white" />
          </button>
        </div>
      )}
    </div>
  );
};
