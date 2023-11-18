db.employee.remove({});
const employeeDB = [
    {
      id: '1',
      firstName: 'John',
      lastName: 'Doe',
      age: 30,
      dateOfJoining: new Date().toISOString(),
      title: 'Employee',
      department: 'IT',
      employeeType: 'FullTime',
      currentStatus: true,
    },
    {
      id: '2',
      firstName: 'Jane',
      lastName: 'Smith',
      age: 28,
      dateOfJoining: new Date().toISOString(),
      title: 'Employee',
      department: 'IT',
      employeeType: 'PartTime',
      currentStatus: true,
    },
  ];

db.employee.insertMany(employeeDB);
const count = db.employee.count();
print('Inserted', count, 'employee');
db.counters.remove({ _id: 'employee' });
db.counters.insert({ _id: 'employee', current: count });
db.employee.createIndex({ id: 1 }, { unique: true });
