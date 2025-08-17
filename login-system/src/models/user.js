class User {
    constructor() {
        this.username = 'hardcodedUser';
        this.password = 'hardcodedPassword';
    }

    validateCredentials(inputUsername, inputPassword) {
        return inputUsername === this.username && inputPassword === this.password;
    }
}

module.exports = User;