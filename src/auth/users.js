// Fixed in-memory users (no registration). Two users allow testing data isolation.
export const users = [
  { id: 'user-1', username: 'leon', password: 'umbrella123' },
  { id: 'user-2', username: 'kratos', password: 'spartan123' },
  { id: 'user-3', username: 'link', password: 'hyrule123' },
];

export const findByCredentials = (username, password) =>
  users.find((u) => u.username === username && u.password === password);
