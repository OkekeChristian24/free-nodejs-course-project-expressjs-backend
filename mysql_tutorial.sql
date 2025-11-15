mysql -u root -p

-- To Create a database
CREATE DATABASE school;

-- To select or use a database
USE school;

-- To delete a database
DROP DATABASE school;

-- To create a table
CREATE TABLE students (
   id INT PRIMARY KEY AUTO_INCREMENT,
   name VARCHAR(50),
   age INT
);

-- To describe a table
DESCRIBE students;
