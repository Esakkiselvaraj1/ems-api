const fs = require("fs");
const express = require("express");
const { ApolloServer, UserInputError } = require("apollo-server-express");
const { GraphQLScalarType } = require("graphql");
const { Kind } = require("graphql/language");
const { MongoClient } = require("mongodb");
//const url = 'mongodb://localhost/EMS';
const url =  "mongodb+srv://parameshprogrammer:cnUMMEmHF1rXXuH7@cluster0.hrziqae.mongodb.net/EMS?retryWrites=true&w=majority";
 // const url ='mongodb://localhost:27017/EMS';
let db;
const employeeDB = [
  {
    id: "1",
    firstName: "John",
    lastName: "Doe",
    age: 30,
    dateOfJoining: new Date().toISOString(),
    title: "Software Engineer",
    department: "Engineering",
    employeeType: "FullTime",
    currentStatus: true,
  },
  {
    id: "2",
    firstName: "Jane",
    lastName: "Smith",
    age: 28,
    dateOfJoining: new Date().toISOString(),
    title: "Product Manager",
    department: "Product",
    employeeType: "FullTime",
    currentStatus: true,
  },
];

const GraphQLDate = new GraphQLScalarType({
  name: "GraphQLDate",
  description: "A Date() type in GraphQL as a scalar",
  serialize(value) {
    return value.toISOString();
  },
  parseValue(value) {
    const dateValue = new Date(value);
    return isNaN(dateValue) ? undefined : dateValue;
  },
  parseLiteral(ast) {
    if (ast.kind == Kind.STRING) {
      const value = new Date(ast.value);
      return isNaN(value) ? undefined : value;
    }
  },
});

const resolvers = {
  Query: {
    employeeList,
    employee,
    upcomingRetirees,
  },
  Mutation: {
    employeeAdd,
    employeeUpdate,
    employeeDelete,
  },
  GraphQLDate,
};
async function employeeDelete(_, { id }) {
  const employee = await db.collection("employee").findOne({ id });
  if (!employee) return false;
  if (employee.currentStatus) {
    return false;
  }
  employee.deleted = new Date();
  let result = await db.collection("deleted_employee").insertOne(employee);
  if (result.insertedId) {
    result = await db.collection("employee").removeOne({ id });
    return result.deletedCount === 1;
  }
  return false;
}
async function employee(_, { id }) {
  const employee = await db.collection("employee").findOne({ id });

  const retirementAge = 65;
  const currentDate = new Date();
  const retirementDate = new Date(employee.dateOfJoining);
  retirementDate.setFullYear(
    retirementDate.getFullYear() + (retirementAge - employee.age)
  );

  const timeDiff = retirementDate - currentDate;
  const yearsLeft = Math.floor(timeDiff / (1000 * 60 * 60 * 24 * 365));
  const monthsLeft = Math.floor(
    (timeDiff % (1000 * 60 * 60 * 24 * 365)) / (1000 * 60 * 60 * 24 * 30)
  );
  const daysLeft = Math.floor(
    (timeDiff % (1000 * 60 * 60 * 24 * 30)) / (1000 * 60 * 60 * 24)
  );

  const employeeRetrivment = {
    ...employee,
   
      years: yearsLeft,
      months: monthsLeft,
      days: daysLeft,
   
  };
  console.log(employeeRetrivment);
  return employeeRetrivment;
}
async function upcomingRetirees(_, { employeeType }) {
  const filter = {};
  const retirementAge=65;
  const retirementThreshold = new Date();
    retirementThreshold.setMonth(retirementThreshold.getMonth() + 6);
  console.log(retirementThreshold);
  if (employeeType) filter.employeeType = employeeType;
  const employees = await db.collection("employee").find(filter).toArray();
  let upcomingRetirees=[]
 
  for (let i = 0; i < employees.length; i++) {
    let employee = employees[i];
    let retirementDate = new Date(employee.dateOfJoining);
    retirementDate.setFullYear(
      retirementDate.getFullYear() + (retirementAge - employee.age)
    );
    
    if (retirementDate <= retirementThreshold && retirementDate>= new Date()){
      upcomingRetirees.push(employee);
      
    }
  }
 
  console.log(upcomingRetirees)
  return upcomingRetirees;
}
async function employeeList(_, { employeeType }) {
  const filter = {};
  if (employeeType) filter.employeeType = employeeType;
  const employees = await db.collection("employee").find(filter).toArray();
  console.log(employees)
  return employees;
}
async function employeeUpdate(_, { id, changes }) {
  if (changes.title || changes.department || changes.currentStatus) {
    const employee = await db.collection("employee").findOne({ id });
    Object.assign(employee, changes);
    employeeValidate(employee);
  }
  await db.collection("employee").updateOne({ id }, { $set: changes });
  const savedemployee = await db.collection("employee").findOne({ id });
  return savedemployee;
}

/*async function employeeList() {
  const employees = await db.collection('employee').find({}).toArray();
  console.log(employees)
  return employees;
}*/

function employeeValidate(employee) {
  const errors = [];

  const allowedTitles = ["Employee", "Manager", "Director", "VP"];
  if (!allowedTitles.includes(employee.title)) {
    errors.push(
      "Invalid title. Allowed values: Employee, Manager, Director, VP"
    );
  }

  const allowedDepartments = ["IT", "Marketing", "HR", "Engineering"];
  if (!allowedDepartments.includes(employee.department)) {
    errors.push(
      "Invalid department. Allowed values: IT, Marketing, HR, Engineering"
    );
  }

  const allowedEmployeeTypes = ["FullTime", "PartTime", "Contract", "Seasonal"];
  if (!allowedEmployeeTypes.includes(employee.employeeType)) {
    errors.push(
      "Invalid employee type. Allowed values: FullTime, PartTime, Contract, Seasonal"
    );
  }

  if (employee.age < 20 || employee.age > 70) {
    errors.push("Invalid age. Allowed range: 20-70");
  }
  if (errors.length > 0) {
    throw new UserInputError("Invalid input(s)", { errors });
  }
}
async function getNextSequence(name) {
  const result = await db
    .collection("counters")
    .findOneAndUpdate(
      { _id: name },
      { $inc: { current: 1 } },
      { returnDocument: false }
    );

  return result.value.current;
}

async function employeeAdd(_, { employee }) {
  employeeValidate(employee);

  employee.id = await getNextSequence("employee");

  const result = await db.collection("employee").insertOne(employee);
  const savedEmployee = await db
    .collection("employee")
    .findOne({ _id: result.insertedId });
  return savedEmployee;
}
async function connectToDb() {
  const client = new MongoClient(url, {
    useUnifiedTopology: true,
    useNewUrlParser: true,
  });
  await client.connect();
  console.log("Connected to MongoDB at", url);
  db = client.db();
}

const server = new ApolloServer({
  typeDefs: fs.readFileSync("schema.graphql", "utf-8"),
  resolvers,
  formatError: (error) => {
    console.log(error);
    return error;
  },
});

const app = express();

server.applyMiddleware({ app, path: "/graphql" });

(async function () {
  try {
    await connectToDb();
    app.listen(3000, function () {
      console.log("API Server started on port 3000");
    });
  } catch (err) {
    console.log("ERROR:", err);
  }
})();
