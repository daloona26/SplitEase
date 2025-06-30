const  users: any[] = [];
const groups: any[] = [];
const expenses: any[] = [];

export const db = {
  users,
  groups,
  expenses,
  
  createUser: (user: any) => {
    const newUser = { ...user, id: Date.now(), created_at: new Date() };
    users.push(newUser);
    return newUser;
  },
  
  findUserByEmail: (email: string) => {
    return users.find(u => u.email === email);
  },
  
  createGroup: (group: any) => {
    const newGroup = { ...group, id: Date.now(), created_at: new Date() };
    groups.push(newGroup);
    return newGroup;
  },
  
  addExpense: (expense: any) => {
    const newExpense = { ...expense, id: Date.now(), created_at: new Date() };
    expenses.push(newExpense);
    return newExpense;
  }
};

export default db;
 