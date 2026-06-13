import * as XLSX from "xlsx";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

export const exportToExcel = (data: any[], fileName: string) => {
  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Sheet1");
  XLSX.writeFile(workbook, `${fileName}.xlsx`);
};

export const exportConversationsToExcel = (conversations: any[], fileName: string) => {
  const formattedData = conversations.map(c => ({
    "ID Hội thoại": c.id,
    "Học sinh": c.user?.name || "N/A",
    "Email": c.user?.email || "N/A",
    "Chatbot": c.chatbot?.name || "N/A",
    "Lớp": c.chatbot?.class?.name || "Cá nhân",
    "Số tin nhắn": c.messagesCount || 0,
    "Ngày tạo": new Date(c.startedAt || c.createdAt).toLocaleString("vi-VN"),
    "Cập nhật cuối": new Date(c.updatedAt).toLocaleString("vi-VN"),
  }));
  
  exportToExcel(formattedData, fileName);
};

export const exportToPDF = (headers: string[], data: any[][], fileName: string, title: string) => {
  const doc = new jsPDF();
  
  // Title
  doc.setFontSize(18);
  doc.text(title, 14, 22);
  
  // Date
  doc.setFontSize(11);
  doc.setTextColor(100);
  doc.text(`Ngày xuất: ${new Date().toLocaleString("vi-VN")}`, 14, 30);
  
  autoTable(doc, {
    head: [headers],
    body: data,
    startY: 35,
    styles: { font: "helvetica", fontSize: 9 }, // Standard font, may have issues with VN characters but common for jspdf
    headStyles: { fillColor: [66, 133, 244] },
  });
  
  doc.save(`${fileName}.pdf`);
};

export const exportConversationsToPDF = (conversations: any[], fileName: string, title: string) => {
  const headers = ["Học sinh", "Chatbot", "Lớp", "Tin nhắn", "Ngày"];
  const data = conversations.map(c => [
    c.user?.name || "N/A",
    c.chatbot?.name || "N/A",
    c.chatbot?.class?.name || "N/A",
    c.messagesCount || 0,
    new Date(c.updatedAt).toLocaleDateString("vi-VN")
  ]);
  
  exportToPDF(headers, data, fileName, title);
};
