// Equal split
export const equalSplit = (totalAmount, people) => {
  const share = parseFloat((totalAmount / people.length).toFixed(2));
  return people.map((person, index) => {
    // Handle rounding difference on last person
    const isLast = index === people.length - 1;
    const othersTotal = share * (people.length - 1);
    const lastShare = parseFloat((totalAmount - othersTotal).toFixed(2));
    return {
      ...person,
      share: isLast ? lastShare : share,
      paid: false,
    };
  });
};

// Item-based split
export const itemSplit = (items, people) => {
  const totals = {};
  people.forEach(p => totals[p.id] = 0);

  items.forEach(item => {
    const assignedTo = item.assignedTo || [];
    if (assignedTo.length === 0) return;
    const share = parseFloat((item.price / assignedTo.length).toFixed(2));
    assignedTo.forEach(personId => {
      totals[personId] = parseFloat((totals[personId] + share).toFixed(2));
    });
  });

  return people.map(person => ({
    ...person,
    share: totals[person.id] || 0,
    paid: false,
  }));
};

// Generate UPI deep link
export const generateUPILink = (upiId, name, amount, note) => {
  const encodedName = encodeURIComponent(name);
  const encodedNote = encodeURIComponent(note || 'Bill split');
  return `upi://pay?pa=${upiId}&pn=${encodedName}&am=${amount}&cu=INR&tn=${encodedNote}`;
};