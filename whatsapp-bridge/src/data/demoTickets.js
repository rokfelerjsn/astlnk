const baseTickets = [
  {
    id: "75777",
    ticketCode: "TK-75777",
    category: "Kelistrikan (Lampu / Stop Kontak)",
    building: "Gedung D",
    room: "382",
    reporterName: "Mahasiswa",
    reporterPhone: "081234567890",
    description: "Lampu ruangan tidak menyala",
    technicianName: "Pak Budi",
    status: "Ditugaskan",
    createdAt: "02 Jun 2026, 07:20",
    resolvedAt: null,
    photoPath: null,
  },
];

const tickets = new Map();

export function resetDemoTickets() {
  tickets.clear();

  for (const ticket of baseTickets) {
    tickets.set(ticket.id, { ...ticket });
  }
}

export function findTicket(ticketId) {
  return tickets.get(String(ticketId)) ?? null;
}

export function demoTicket() {
  return findTicket("75777");
}

resetDemoTickets();
