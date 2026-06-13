import { useState } from "react";
import { X, Search } from "lucide-react";
import { GlassCard, Button, showToast } from "../ui";
import { classApi } from "../../services/classApi";

interface JoinClassModalProps {
  onClose: () => void;
  onJoined: () => void;
}

export function JoinClassModal({ onClose, onJoined }: JoinClassModalProps) {
  const [classId, setClassId] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!classId.trim()) return;

    try {
      setLoading(true);
      await classApi.joinClass(classId.trim());
      showToast("Đã gửi yêu cầu gia nhập lớp thành công!", "success");
      onJoined();
      onClose();
    } catch (err: any) {
      showToast(err.response?.data?.error || "Không thể gia nhập lớp. Vui lòng kiểm tra lại mã lớp.", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <GlassCard padding="lg" className="w-full max-w-md relative animate-in fade-in zoom-in duration-200">
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-secondary hover:text-white transition-colors"
        >
          <X size={20} />
        </button>

        <div className="text-center mb-6">
          <div className="w-12 h-12 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <Search className="text-primary" size={24} />
          </div>
          <h2 className="text-xl font-bold">Gia nhập lớp học</h2>
          <p className="text-sm text-secondary mt-1">
            Nhập mã lớp (Class ID) được cung cấp bởi giáo viên
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-secondary mb-2">
              Mã lớp học
            </label>
            <input 
              type="text"
              required
              placeholder="Ví dụ: 550e8400-e29b-41d4-a716-446655440000"
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:border-primary/50 transition-colors text-sm"
              value={classId}
              onChange={(e) => setClassId(e.target.value)}
              disabled={loading}
            />
          </div>

          <div className="flex gap-3 mt-2">
            <Button 
              type="button" 
              variant="ghost" 
              className="flex-1" 
              onClick={onClose}
              disabled={loading}
            >
              Hủy
            </Button>
            <Button 
              type="submit" 
              variant="primary" 
              className="flex-1" 
              loading={loading}
            >
              Gia nhập
            </Button>
          </div>
        </form>
      </GlassCard>
    </div>
  );
}
