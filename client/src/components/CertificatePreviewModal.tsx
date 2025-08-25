import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, X } from "lucide-react";

interface CertificateUser {
  id: string;
  firstName: string;
  surname: string;
  middleName?: string;
  tagNumber?: string;
  role: "staff" | "resource_person" | "trainee";
  certificateId: string;
}

interface CertificatePreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: CertificateUser | null;
  onDownload: (user: CertificateUser) => void;
}

export default function CertificatePreviewModal({
  isOpen,
  onClose,
  user,
  onDownload
}: CertificatePreviewModalProps) {
  if (!user) return null;

  const getRoleText = (role: string) => {
    switch (role) {
      case 'staff':
        return 'Staff Member';
      case 'resource_person':
        return 'Resource Person';
      case 'trainee':
        return 'Trainee';
      default:
        return role;
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'staff':
        return <Badge variant="default">Staff</Badge>;
      case 'resource_person':
        return <Badge variant="secondary">Resource Person</Badge>;
      case 'trainee':
        return <Badge variant="outline">Trainee</Badge>;
      default:
        return <Badge variant="outline">{role}</Badge>;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto" onInteractOutside={(e) => e.preventDefault()} onEscapeKeyDown={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Certificate Preview</span>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Certificate Preview */}
          <div className="border-2 border-gray-200 rounded-lg p-8 bg-gradient-to-br from-blue-50 to-indigo-50">
            <div className="text-center space-y-6">
              {/* Header */}
              <div className="border-b-2 border-blue-200 pb-4">
                <h1 className="text-3xl font-bold text-blue-900 mb-2">
                  Certificate of Completion
                </h1>
                <p className="text-blue-700">Training Management System</p>
              </div>

              {/* Main Content */}
              <div className="py-8">
                <p className="text-lg text-gray-700 mb-6">
                  This is to certify that
                </p>
                
                <div className="mb-6">
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">
                    {user.firstName} {user.middleName} {user.surname}
                  </h2>
                  <div className="flex items-center justify-center gap-4">
                    {getRoleBadge(user.role)}
                    {user.tagNumber && (
                      <Badge variant="outline">Tag: {user.tagNumber}</Badge>
                    )}
                  </div>
                </div>

                <p className="text-lg text-gray-700 mb-6">
                  has successfully completed the training program as a
                </p>
                
                <p className="text-xl font-semibold text-blue-900 mb-6">
                  {getRoleText(user.role)}
                </p>

                <p className="text-lg text-gray-700">
                  Certificate ID: <span className="font-mono font-bold text-blue-900">{user.certificateId}</span>
                </p>
              </div>

              {/* Footer */}
              <div className="border-t-2 border-blue-200 pt-4">
                <div className="grid grid-cols-2 gap-8 text-sm text-gray-600">
                  <div>
                    <p className="font-semibold">Date Issued:</p>
                    <p>{new Date().toLocaleDateString()}</p>
                  </div>
                  <div>
                    <p className="font-semibold">Valid Until:</p>
                    <p>{new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toLocaleDateString()}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* User Details */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="font-semibold text-gray-900 mb-3">User Details</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium text-gray-600">Full Name:</span>
                <p className="text-gray-900">{user.firstName} {user.middleName} {user.surname}</p>
              </div>
              <div>
                <span className="font-medium text-gray-600">Role:</span>
                <p className="text-gray-900">{getRoleText(user.role)}</p>
              </div>
              {user.tagNumber && (
                <div>
                  <span className="font-medium text-gray-600">Tag Number:</span>
                  <p className="text-gray-900">{user.tagNumber}</p>
                </div>
              )}
              <div>
                <span className="font-medium text-gray-600">Certificate ID:</span>
                <p className="text-gray-900 font-mono">{user.certificateId}</p>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
            <Button 
              onClick={() => onDownload(user)}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Download className="mr-2 h-4 w-4" />
              Download Certificate
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
} 