export type GuardianRelationship = "mother" | "father" | "guardian" | "other";

export const RELATIONSHIP_LABELS: Record<GuardianRelationship, string> = {
  mother: "Mother",
  father: "Father",
  guardian: "Guardian",
  other: "Other",
};

export type ParentChild = {
  id: string;
  name: string | null;
  relationship: GuardianRelationship;
  isPrimary: boolean;
};

export type CoParent = {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
};

export type ParentRow = {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  createdAt: string;
  children: { id: string; name: string | null }[];
  isPrimaryContact: boolean;
  coParents: CoParent[];
};

export type ParentDetail = {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  createdAt: string;
  children: ParentChild[];
  coParents: CoParent[];
  isPrimaryContact: boolean;
};

export type ParentInvoice = {
  id: string;
  invoiceNumber: number;
  amountCents: number;
  status: string;
  dueDate: string | null;
  issuedAt: string | null;
  paidAt: string | null;
  studentName: string | null;
};

export type ParentPayment = {
  id: string;
  amountCents: number;
  currency: string;
  status: string;
  createdAt: string;
  invoiceId: string | null;
  invoiceNumber: number | null;
  stripePaymentIntentId: string | null;
};

export type ParentOrder = {
  id: string;
  totalCents: number;
  status: string;
  createdAt: string;
};

export type StudentOption = {
  id: string;
  name: string | null;
};
