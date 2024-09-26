# webapp

This Assignment is a backend API web application developed with Node.js and MySQL, featuring a health check endpoint (`/healthz`) that verifies the MySQL database connection by returning `200 OK` if the application is healthy and `503 Service Unavailable` if it is not. The health check functionality allows for proactive monitoring of the application's status, ensuring that traffic is routed only to healthy instances, and it can be easily tested using Postman with simple GET requests. 

Programming Language: Node.js
Database: MySQL