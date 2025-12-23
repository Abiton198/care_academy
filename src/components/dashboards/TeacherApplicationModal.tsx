"use client";

import TeacherApplicationForm from "../auth/TeacherApplicationForm";

interface Props {
  open: boolean;
  onClose: () => void;
  applicationId?: string | null;
}

export default function TeacherApplicationModal({
  open,
  onClose,
  applicationId,
}: Props) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <TeacherApplicationForm
        applicationId={applicationId}
        onClose={onClose}
        onSubmitted={onClose}
      />
    </div>
  );
}
