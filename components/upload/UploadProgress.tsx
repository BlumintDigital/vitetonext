import { Spinner } from '@/components/ui/Spinner';

interface UploadProgressProps {
  fileName?: string;
}

export function UploadProgress({ fileName }: UploadProgressProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6">
      <div className="relative">
        <div className="w-20 h-20 rounded-full border-2 border-[#1e293b] flex items-center justify-center">
          <Spinner size="lg" />
        </div>
      </div>
      <div className="text-center">
        <p className="text-[#f1f5f9] font-medium">Uploading & analyzing…</p>
        {fileName && <p className="text-[#475569] text-sm mt-1">{fileName}</p>}
      </div>
    </div>
  );
}
