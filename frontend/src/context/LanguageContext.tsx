import { createContext, useContext, useState, type ReactNode } from 'react';

type Lang = 'en' | 'bn';

interface LanguageContextType {
  lang: Lang;
  toggle: () => void;
  t: (key: string) => string;
}

const translations: Record<string, Record<Lang, string>> = {
  // AppLayout
  'logout': { en: 'Logout', bn: 'লগআউট' },
  'dashboard': { en: 'Dashboard', bn: 'ড্যাশবোর্ড' },
  'inventory': { en: 'Inventory', bn: 'ইনভেন্টরি' },
  'transfers': { en: 'Transfers', bn: 'ট্রান্সফার' },
  'downtime': { en: 'Downtime', bn: 'ডাউনটাইম' },
  'maintenance': { en: 'Maintenance', bn: 'রক্ষণাবেক্ষণ' },
  'spare_parts': { en: 'Spare Parts', bn: 'যন্ত্রাংশ' },
  'rental': { en: 'Rental', bn: 'ভাড়া' },
  'mechanic_kpi': { en: 'Mechanic KPI', bn: 'মেকানিক কেপিআই' },
  'user_management': { en: 'User Management', bn: 'ব্যবহারকারী ব্যবস্থাপনা' },
  'system_admin': { en: 'System Admin', bn: 'সিস্টেম অ্যাডমিন' },
  'security_dashboard': { en: 'Security Dashboard', bn: 'নিরাপত্তা ড্যাশবোর্ড' },
  'spare_part_approval': { en: 'Spare Part Approval', bn: 'যন্ত্রাংশ অনুমোদন' },
  'service_requests': { en: 'Service Requests', bn: 'সার্ভিস অনুরোধ' },
  'my_machines': { en: 'My Machines', bn: 'আমার মেশিন' },
  'service_history': { en: 'Service History', bn: 'সার্ভিস ইতিহাস' },

  // Roles
  'role_super_admin': { en: 'Super Admin', bn: 'সুপার অ্যাডমিন' },
  'role_admin': { en: 'Admin', bn: 'অ্যাডমিন' },
  'role_user': { en: 'User', bn: 'ব্যবহারকারী' },
  'role_line_chief': { en: 'Line Chief', bn: 'লাইন চিফ' },
  'role_mechanic': { en: 'Mechanic', bn: 'মেকানিক' },
  'role_system_admin': { en: 'System Admin', bn: 'সিস্টেম অ্যাডমিন' },
  'role_security': { en: 'Security', bn: 'নিরাপত্তা' },
  'role_technical_manager': { en: 'Technical Manager', bn: 'টেকনিক্যাল ম্যানেজার' },

  // Dashboard
  'total_active_machines': { en: 'Total Active Machines', bn: 'মোট সক্রিয় মেশিন' },
  'pending_approvals': { en: 'Pending Approvals', bn: 'অপেক্ষমান অনুমোদন' },
  'active_downtime': { en: 'Active Downtime', bn: 'সক্রিয় ডাউনটাইম' },
  'pending_transfers': { en: 'Pending Transfers', bn: 'অপেক্ষমান ট্রান্সফার' },
  'active_rentals': { en: 'Active Rentals', bn: 'সক্রিয় ভাড়া' },
  'spare_parts_pending': { en: 'Spare Parts Pending', bn: 'যন্ত্রাংশ অপেক্ষমান' },
  'machines_by_factory': { en: 'Machines by Factory', bn: 'কারখানা অনুযায়ী মেশিন' },
  'machines_by_type': { en: 'Machines by Type', bn: 'ধরন অনুযায়ী মেশিন' },
  'machines_by_floor': { en: 'Machines by Floor', bn: 'ফ্লোর অনুযায়ী মেশিন' },
  'recent_activity': { en: 'Recent Activity', bn: 'সাম্প্রতিক কার্যকলাপ' },
  'overdue_loans': { en: 'Overdue Loans', bn: 'মেয়াদোত্তীর্ণ ঋণ' },
  'active_loans': { en: 'Active Loans', bn: 'সক্রিয় ঋণ' },

  // Inventory
  'add_machine': { en: 'Add Machine', bn: 'মেশিন যোগ করুন' },
  'machine_no': { en: 'Machine No', bn: 'মেশিন নং' },
  'section': { en: 'Section', bn: 'সেকশন' },
  'type': { en: 'Type', bn: 'ধরন' },
  'brand': { en: 'Brand', bn: 'ব্র্যান্ড' },
  'model': { en: 'Model', bn: 'মডেল' },
  'floor': { en: 'Floor', bn: 'ফ্লোর' },
  'line': { en: 'Line', bn: 'লাইন' },
  'factory': { en: 'Factory', bn: 'কারখানা' },
  'status': { en: 'Status', bn: 'স্ট্যাটাস' },
  'actions': { en: 'Actions', bn: 'অ্যাকশন' },
  'search': { en: 'Search', bn: 'অনুসন্ধান' },
  'approve': { en: 'Approve', bn: 'অনুমোদন' },
  'reject': { en: 'Reject', bn: 'প্রত্যাখ্যান' },
  'serial_no': { en: 'Serial No', bn: 'সিরিয়াল নং' },
  'submit': { en: 'Submit', bn: 'জমা দিন' },
  'cancel': { en: 'Cancel', bn: 'বাতিল' },
  'close': { en: 'Close', bn: 'বন্ধ' },
  'print': { en: 'Print', bn: 'প্রিন্ট' },
  'view': { en: 'View', bn: 'দেখুন' },
  'edit': { en: 'Edit', bn: 'সম্পাদনা' },
  'delete': { en: 'Delete', bn: 'মুছুন' },
  'save': { en: 'Save', bn: 'সংরক্ষণ' },
  'active': { en: 'Active', bn: 'সক্রিয়' },
  'pending': { en: 'Pending', bn: 'অপেক্ষমান' },
  'approved': { en: 'Approved', bn: 'অনুমোদিত' },
  'rejected': { en: 'Rejected', bn: 'প্রত্যাখ্যাত' },
  'filter_by_factory': { en: 'Filter by Factory', bn: 'কারখানা অনুযায়ী ফিল্টার' },

  // Transfers
  'new_transfer': { en: 'New Transfer', bn: 'নতুন ট্রান্সফার' },
  'transfer_type': { en: 'Transfer Type', bn: 'ট্রান্সফারের ধরন' },
  'loan_temporary': { en: 'Loan (Temporary)', bn: 'ঋণ (অস্থায়ী)' },
  'permanent_transfer': { en: 'Permanent Transfer', bn: 'স্থায়ী ট্রান্সফার' },
  'internal_floor_change': { en: 'Internal (Floor Change)', bn: 'অভ্যন্তরীণ (ফ্লোর পরিবর্তন)' },
  'from': { en: 'From', bn: 'হতে' },
  'to': { en: 'To', bn: 'গন্তব্য' },
  'move_to': { en: 'Move To', bn: 'স্থানান্তর' },
  'reason': { en: 'Reason', bn: 'কারণ' },
  'machine': { en: 'Machine', bn: 'মেশিন' },
  'requested': { en: 'Requested', bn: 'অনুরোধকৃত' },
  'first_approved': { en: '1st Approved (HoD)', bn: '১ম অনুমোদিত (প্রধান)' },
  'second_approved': { en: '2nd Approved (Admin)', bn: '২য় অনুমোদিত (প্রশাসন)' },
  'dispatched': { en: 'Dispatched', bn: 'প্রেরিত' },
  'received': { en: 'Security Received', bn: 'নিরাপত্তা গৃহীত' },
  'condition_confirmed': { en: 'Confirmed & Added', bn: 'নিশ্চিত ও যোগ হয়েছে' },
  'completed': { en: 'Completed', bn: 'সম্পন্ন' },
  'return_requested': { en: 'Return Requested', bn: 'ফেরত অনুরোধ' },
  'return_first_approved': { en: 'Return 1st Approved', bn: 'ফেরত ১ম অনুমোদিত' },
  'return_second_approved': { en: 'Return 2nd Approved', bn: 'ফেরত ২য় অনুমোদিত' },
  'return_dispatched': { en: 'Return Dispatched', bn: 'ফেরত প্রেরিত' },
  'returned': { en: 'Returned', bn: 'ফেরত এসেছে' },
  'dispatch': { en: 'Dispatch', bn: 'প্রেরণ' },
  'receive': { en: 'Receive', bn: 'গ্রহণ' },
  'confirm_add_inventory': { en: 'Confirm & Add to Inventory', bn: 'নিশ্চিত করুন ও ইনভেন্টরিতে যোগ করুন' },
  'request_return': { en: 'Request Return', bn: 'ফেরত অনুরোধ করুন' },
  'approve_return': { en: '1st Approve Return', bn: '১ম ফেরত অনুমোদন' },
  'second_approve_return': { en: '2nd Approve Return', bn: '২য় ফেরত অনুমোদন' },
  'dispatch_return': { en: 'Dispatch Return', bn: 'ফেরত প্রেরণ' },
  'receive_return': { en: 'Receive Return', bn: 'ফেরত গ্রহণ' },
  'reject_transfer': { en: 'Reject Transfer', bn: 'ট্রান্সফার প্রত্যাখ্যান' },
  'rejection_reason': { en: 'Rejection Reason', bn: 'প্রত্যাখ্যানের কারণ' },
  'transfer_details': { en: 'Transfer Details', bn: 'ট্রান্সফার বিবরণ' },
  'expected_return': { en: 'Expected Return', bn: 'প্রত্যাশিত ফেরত' },
  'expected_return_date': { en: 'Expected Return Date', bn: 'প্রত্যাশিত ফেরতের তারিখ' },
  'chalan': { en: 'Chalan', bn: 'চালান' },
  'return_chalan': { en: 'Return Chalan', bn: 'ফেরত চালান' },
  'overdue': { en: 'OVERDUE', bn: 'মেয়াদোত্তীর্ণ' },
  'basis': { en: 'Basis', bn: 'ভিত্তি' },
  'select_machine': { en: 'Select machine', bn: 'মেশিন নির্বাচন করুন' },

  // Downtime
  'report_downtime': { en: 'Report Downtime', bn: 'ডাউনটাইম রিপোর্ট করুন' },
  'acknowledge': { en: 'Acknowledge', bn: 'গ্রহণ করুন' },
  'finish': { en: 'Finish', bn: 'সম্পন্ন' },
  'verify': { en: 'Verify', bn: 'যাচাই' },
  'reported_by': { en: 'Reported By', bn: 'রিপোর্টকারী' },
  'mechanic_name': { en: 'Mechanic', bn: 'মেকানিক' },
  'issue': { en: 'Issue', bn: 'সমস্যা' },
  'repair_note': { en: 'Repair Note', bn: 'মেরামত নোট' },
  'parts_used': { en: 'Parts Used', bn: 'ব্যবহৃত যন্ত্রাংশ' },
  'waiting': { en: 'Waiting', bn: 'অপেক্ষমান' },
  'repairing': { en: 'Repairing', bn: 'মেরামত চলছে' },
  'awaiting_verification': { en: 'Awaiting Verification', bn: 'যাচাই অপেক্ষমান' },
  'verified': { en: 'Verified', bn: 'যাচাইকৃত' },
  'finish_servicing': { en: 'Finish Servicing', bn: 'সার্ভিসিং শেষ করুন' },

  // Spare Parts
  'request_spare_part': { en: 'Request Spare Part', bn: 'যন্ত্রাংশের অনুরোধ' },
  'bill_no': { en: 'Bill No', bn: 'বিল নং' },
  'part_name': { en: 'Part Name', bn: 'যন্ত্রাংশের নাম' },
  'quantity': { en: 'Quantity', bn: 'পরিমাণ' },
  'unit': { en: 'Unit', bn: 'একক' },
  'requested_by': { en: 'Requested By', bn: 'অনুরোধকারী' },
  'date': { en: 'Date', bn: 'তারিখ' },
  'request_part': { en: 'Request Part', bn: 'যন্ত্রাংশ অনুরোধ করুন' },
  'parts_catalog': { en: 'Parts Catalog', bn: 'যন্ত্রাংশ ক্যাটালগ' },
  'analytics': { en: 'Analytics', bn: 'পরিসংখ্যান' },
  'requests': { en: 'Requests', bn: 'অনুরোধসমূহ' },
  'total_requests': { en: 'Total Requests', bn: 'মোট অনুরোধ' },
  'total_parts_qty': { en: 'Total Parts Qty', bn: 'মোট যন্ত্রাংশ পরিমাণ' },
  'pending_requests': { en: 'Pending Requests', bn: 'অপেক্ষমান অনুরোধ' },
  'catalog_parts': { en: 'Catalog Parts', bn: 'ক্যাটালগ যন্ত্রাংশ' },
  'add_more_parts': { en: 'Add more parts', bn: 'আরও যন্ত্রাংশ যোগ করুন' },
  'at_least_one_part': { en: 'Add at least one part', bn: 'অন্তত একটি যন্ত্রাংশ যোগ করুন' },
  'store_requisition': { en: 'Store Requisition', bn: 'স্টোর খরচপত্র' },
  'search_parts': { en: 'Search by Bill No, Part, Machine, or Requester', bn: 'বিল নং, যন্ত্রাংশ, মেশিন, বা অনুরোধকারী দিয়ে খুঁজুন' },
  'comment': { en: 'Comment', bn: 'মন্তব্য' },
  'description': { en: 'Description', bn: 'বিবরণ' },

  // TechManager
  'pending_tab': { en: 'Pending Requests', bn: 'অপেক্ষমান অনুরোধ' },
  'history': { en: 'History', bn: 'ইতিহাস' },
  'no_pending': { en: 'No pending requests', bn: 'কোনো অপেক্ষমান অনুরোধ নেই' },
  'rejection_reason_placeholder': { en: 'Enter rejection reason...', bn: 'প্রত্যাখ্যানের কারণ লিখুন...' },
  'reject_confirm': { en: 'Confirm Reject', bn: 'প্রত্যাখ্যান করুন' },

  // Mechanic
  'scan_qr': { en: 'Scan QR', bn: 'QR স্ক্যান' },
  'new_reports': { en: 'New Reports', bn: 'নতুন রিপোর্ট' },
  'in_progress': { en: 'In Progress', bn: 'চলমান' },
  'waiting_time': { en: 'Waiting', bn: 'অপেক্ষমান' },
  'repair_time': { en: 'Repair Time', bn: 'মেরামতের সময়' },

  // Line Chief
  'total_machines': { en: 'Total Machines', bn: 'মোট মেশিন' },
  'under_repair': { en: 'Under Repair', bn: 'মেরামতাধীন' },
  'on_loan': { en: 'On Loan', bn: 'ঋণে আছে' },

  // Security
  'pending_dispatch': { en: 'Pending Dispatch', bn: 'প্রেরণ অপেক্ষমান' },
  'pending_receive': { en: 'Pending Receive', bn: 'গ্রহণ অপেক্ষমান' },

  // Rental
  'new_rental': { en: 'New Rental Request', bn: 'নতুন ভাড়ার অনুরোধ' },
  'machine_type': { en: 'Machine Type', bn: 'মেশিনের ধরন' },
  'supplier': { en: 'Supplier', bn: 'সরবরাহকারী' },
  'justification': { en: 'Justification', bn: 'যৌক্তিকতা' },
  'estimated_days': { en: 'Estimated Days', bn: 'আনুমানিক দিন' },
  'confirm_receipt': { en: 'Confirm Receipt', bn: 'গ্রহণ নিশ্চিত করুন' },
  'confirm_condition': { en: 'Confirm Condition', bn: 'অবস্থা নিশ্চিত করুন' },
  'denied': { en: 'Denied', bn: 'প্রত্যাখ্যাত' },
  'in_use': { en: 'In Use', bn: 'ব্যবহারে' },
  'condition_note': { en: 'Condition Note', bn: 'অবস্থার নোট' },

  // User Management
  'add_user': { en: 'Add User', bn: 'ব্যবহারকারী যোগ করুন' },
  'username': { en: 'Username', bn: 'ইউজারনেম' },
  'password': { en: 'Password', bn: 'পাসওয়ার্ড' },
  'full_name': { en: 'Full Name', bn: 'পুরো নাম' },
  'role': { en: 'Role', bn: 'ভূমিকা' },
  'facility': { en: 'Facility', bn: 'কারখানা' },
  'assigned_lines': { en: 'Assigned Lines', bn: 'নির্ধারিত লাইন' },

  // Maintenance
  'add_maintenance': { en: 'Add Maintenance', bn: 'রক্ষণাবেক্ষণ যোগ করুন' },

  // Login
  'sign_in': { en: 'Sign In', bn: 'সাইন ইন' },
  'welcome': { en: 'Welcome', bn: 'স্বাগতম' },

  // Common
  'loading': { en: 'Loading...', bn: 'লোড হচ্ছে...' },
  'no_data': { en: 'No Data', bn: 'কোনো ডাটা নেই' },
  'success': { en: 'Success', bn: 'সফল' },
  'error': { en: 'Error', bn: 'ত্রুটি' },
  'confirm': { en: 'Confirm', bn: 'নিশ্চিত করুন' },
  'yes': { en: 'Yes', bn: 'হ্যাঁ' },
  'no': { en: 'No', bn: 'না' },
  'total': { en: 'Total', bn: 'মোট' },
  'select': { en: 'Select', bn: 'নির্বাচন করুন' },
  'language': { en: 'EN', bn: 'বাং' },
};

const LanguageContext = createContext<LanguageContextType>(null!);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>(() => {
    try {
      return (localStorage.getItem('app_lang') as Lang) || 'en';
    } catch {
      return 'en';
    }
  });

  const toggle = () => {
    const next = lang === 'en' ? 'bn' : 'en';
    setLang(next);
    try { localStorage.setItem('app_lang', next); } catch {}
  };

  const t = (key: string): string => {
    return translations[key]?.[lang] || key;
  };

  return (
    <LanguageContext.Provider value={{ lang, toggle, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export const useLang = () => useContext(LanguageContext);
