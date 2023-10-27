document.addEventListener('DOMContentLoaded', function() {
    const loginForm = document.getElementById('login-form');

    loginForm.addEventListener('submit', async function(event) {
        event.preventDefault();

        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;

        // Hash the password using SHA-256
        const hashedPassword = await hashPassword(password);

        // Create a data object to send in the POST request
        const data = {
            username: username,
            password: hashedPassword,
        };

        // Send the data to the server using a POST request
        fetch('/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        })
        .then(response => response.json())
        .then(data => {
            // Handle the server response (e.g., redirect or display a message)
            console.log(data);
        })
        .catch(error => {
            console.error('Error:', error);
        });
    });

    // Function to hash the password using SHA-256
    async function hashPassword(password) {
        const encoder = new TextEncoder();
        const data = encoder.encode(password);
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const hashHex = hashArray.map(byte => byte.toString(16).padStart(2, '0')).join('');
        return hashHex;
    }
});
