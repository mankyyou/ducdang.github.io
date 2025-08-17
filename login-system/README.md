# Login System

This project is a simple login system built using Node.js, Express, and MongoDB. It demonstrates how to authenticate users with hardcoded credentials and connect to an online MongoDB database.

## Project Structure

```
login-system
├── src
│   ├── app.js          # Entry point of the application
│   ├── db.js           # Database connection handling
│   ├── routes
│   │   └── auth.js     # Authentication routes
│   └── models
│       └── user.js     # User model definition
├── package.json         # NPM configuration file
├── .env                 # Environment variables
└── README.md            # Project documentation
```

## Setup Instructions

1. **Clone the repository:**
   ```
   git clone <repository-url>
   cd login-system
   ```

2. **Install dependencies:**
   ```
   npm install
   ```

3. **Configure environment variables:**
   - Create a `.env` file in the root directory and add your MongoDB connection string:
     ```
     MONGODB_URI=<your-mongodb-connection-string>
     ```

4. **Run the application:**
   ```
   node src/app.js
   ```

## Usage

- To log in, send a POST request to `/login` with the following JSON body:
  ```json
  {
    "userId": "yourUserId",
    "password": "yourPassword"
  }
  ```

- The application will respond with a success message if the credentials are correct, or an error message if they are not.

## License

This project is licensed under the MIT License.