# webapp

This Assignment is a backend API web application developed with Node.js and MySQL, featuring a health check endpoint (`/healthz`) that verifies the MySQL database connection by returning `200 OK` if the application is healthy and `503 Service Unavailable` if it is not. The health check functionality allows for proactive monitoring of the application's status, ensuring that traffic is routed only to healthy instances, and it can be easily tested using Postman with simple GET requests. 

Health Check Endpoint: /healthz to monitor the MySQL database and downstream API status.
User Registration: Create new users by posting to /v1/users.
User Authentication: Basic authentication using email and password.
User Data Management: Retrieve and update user data via /v1/users/self.

Prerequisites for Local Development and Deployment
To successfully build and deploy the application on your local machine, please ensure you have the following software and tools installed:

1. Node.js: You’ll need Node.js version 14 or later. Download it from the official Node.js website.
2. MySQL: Install MySQL Server version 5.7 or later. Ensure that the MySQL service is running and accessible.
3. Postman: For API testing, it's recommended to use Postman, which you can download from postman.com.
4. Git: Install Git for version control. Get it from git-scm.com.

Instructions for Building and Deploying the Application

Follow these steps to build and deploy the application locally:

1. Clone the Repository:  
   Open your terminal and execute the following command to clone the repository:
   git clone https://github.com/your_username/webapp.git
   cd webapp

2. Install Dependencies:  
   Navigate to the project directory and install the necessary Node.js dependencies:
   npm install
   
3. Set Up Environment Variables:  
   Create a `.env` file in the project root directory to configure your MySQL database settings.

4. Start the Application:  
   Launch the application by running:
   node index.js

5. Test the Health Check Endpoint:  
   Open Postman and create a new GET request:

    Select GET as the method and enter http://localhost:3000/healthz as the URL.
    Send the request:
    If the application is healthy and connected to the MySQL database, you will receive a 200 OK response with no payload.
    If the application cannot connect to the MySQL database, a 503 Service Unavailable response will be returned.

    Example of Successful Request:
    URL: http://localhost:3000/healthz
    Response: 200 OK

    Example of Failure:
    URL: http://localhost:3000/healthz
    Response: 503 Service Unavailable

6. User Registration
   To create a new user:

   URL: http://localhost:3000/v1/users
   Method: POST
   Body:
   {json} 
   Response: 201 Created on success
   400 Bad Request for validation errors (e.g., existing email or invalid password).

   Get User Data (Authenticated) (requires basic authentication):
   
   URL: http://localhost:3000/v1/users/self
   Method: GET
   Auth: Basic Auth (use email and password)
   Response: 200 on success

   Update User Data (Authenticated)

   URL: http://localhost:3000/v1/users/self
   Method: PUT
   Auth: Basic Auth (use email and password)
   Body:
   Response: 200 OK on successful update.

   Running Tests: 
   To run tests:
   npm test


6. Stop the Application:  
   To stop the running application, return to your terminal and press `Ctrl + C`.

checking for cicd