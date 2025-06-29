// index.js (or app.js) for your Node.js Backend

// Import necessary modules
const express = require('express');
const { Pool } = require('pg'); // PostgreSQL client
const cors = require('cors'); // Middleware for Cross-Origin Resource Sharing

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3000; // Use environment port or default to 3000

// --- Database Configuration ---
// IMPORTANT: Replace these with your actual PostgreSQL credentials.
// For production, use environment variables (e.g., process.env.DB_USER)
// DO NOT hardcode sensitive credentials in production code.
const pool = new Pool({
    user: 'postgres',       // Make sure this is your actual PostgreSQL username
    host: 'localhost',          // Your PostgreSQL host (e.g., 'localhost', or a remote IP/hostname)
    database: 'dolphin_spa_db', // The name of the database you created
    password: '11111111',       // The password for your PostgreSQL user
    port: 5432,                 // Default PostgreSQL port
});

// Test database connection
pool.connect()
    .then(client => {
        console.log('Connected to PostgreSQL database successfully!');
        client.release(); // Release the client back to the pool
    })
    .catch(err => {
        console.error('Error connecting to PostgreSQL database:', err.message);
        console.error('Please check your database credentials and ensure PostgreSQL is running.');
        // Optionally exit the process if database connection is critical
        // process.exit(1);
    });

// --- Middleware ---
// Enable CORS for all origins. In a production environment, you should restrict this
// to only your frontend's domain for better security (e.g., cors({ origin: 'http://yourfrontend.com' }))
app.use(cors());

// Parse JSON request bodies (for POST, PUT requests)
app.use(express.json());

// --- API Routes for Bookings ---

/**
 * @route GET /bookings4
 * @description Get all existing bookings from the database.
 * @returns {Array} An array of booking objects.
 */
app.get('/bookings4', async (req, res) => {
    try {
        // Query to select all bookings from 'bookings4' table, ordered by datetime for consistency
        // and including payment_status and booking_time.
        const result = await pool.query('SELECT * FROM bookings4 ORDER BY datetime DESC;');
        res.json(result.rows); // Send the fetched rows as JSON response
    } catch (err) {
        console.error('Error fetching bookings from bookings4 table:', err);
        res.status(500).json({ error: 'Failed to retrieve bookings from the database.' });
    }
});

/**
 * @route POST /bookings4
 * @description Create a new booking and save it to the database.
 * @body {object} booking - Booking details (service, duration, price, name, phone, datetime)
 * @returns {object} The newly created booking object, including its database ID.
 */
app.post('/bookings4', async (req, res) => {
    // Destructure booking details from the request body
    const { service, duration, price, name, phone, datetime } = req.body;

    // Basic validation (can be expanded for robustness)
    if (!service || !duration || !price || !name || !phone || !datetime) {
        return res.status(400).json({ error: 'All booking fields are required.' });
    }

    try {
        // SQL query to insert a new booking into 'bookings4' table.
        // payment_status defaults to 'pending' as defined in table schema.
        // booking_time automatically set by PostgreSQL's DEFAULT NOW().
        const result = await pool.query(
            'INSERT INTO bookings4(service, duration, price, name, phone, datetime) VALUES($1, $2, $3, $4, $5, $6) RETURNING *;',
            [service, duration, price, name, phone, datetime]
        );
        res.status(201).json(result.rows[0]); // Send the newly created booking object
    } catch (err) {
        console.error('Error adding booking to bookings4 table:', err);
        res.status(500).json({ error: 'Failed to add booking to the database.' });
    }
});

/**
 * @route DELETE /bookings4/:id
 * @description Delete a booking from the database by its ID.
 * @param {string} id - The unique ID of the booking to delete.
 * @returns {object} A success message or an error.
 */
app.delete('/bookings4/:id', async (req, res) => {
    const { id } = req.params; // Get the booking ID from the URL parameters

    try {
        // SQL query to delete a booking from 'bookings4' table by ID
        const result = await pool.query('DELETE FROM bookings4 WHERE id = $1 RETURNING id;', [id]);

        // Check if any row was actually deleted
        if (result.rowCount === 0) {
            return res.status(404).json({ error: `Booking with ID ${id} not found.` });
        }

        res.status(200).json({ message: `Booking with ID ${id} deleted successfully.` });
    } catch (err) {
        console.error('Error deleting booking from bookings4 table:', err);
        res.status(500).json({ error: 'Failed to delete booking from the database.' });
    }
});

// --- API Route for Simulated Payment Initiation ---

/**
 * @route POST /api/payments/initiate
 * @description Simulates initiating a payment and returns a QR code URL.
 * In a real application, this would securely call a payment gateway.
 * @body {object} paymentDetails - Details for the payment (e.g., amount, order_id, service_name, bookingId).
 * @returns {object} An object containing the QR code image URL and a transaction ID.
 */
app.post('/api/payments/initiate', (req, res) => {
    const { amount, serviceName, bookingId } = req.body;

    if (!amount || !serviceName || !bookingId) {
        return res.status(400).json({ error: 'Payment amount, service name, and booking ID are required to initiate payment.' });
    }

    console.log(`Simulating payment initiation for Booking ID: ${bookingId}, Service: ${serviceName}, Amount: ${amount}`);

    // Simulate generating a unique QR code URL based on payment details
    // const simulatedQrCodeUrl = `https://i.postimg.cc/Dz3sgw1N/QR1.jpg?amount=${amount.replace('$', '')}&bookingId=${bookingId}`;
    // const transactionId = `TXN-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // In a real application, here you would store the transactionId and its 'pending' status
    // linked to the bookingId in your database. For this simulation, we're not persisting
    // the transaction ID directly, but the payment confirmation endpoint will use bookingId.

    // Simulate a delay for network latency
    setTimeout(() => {
        res.status(200).json({
            message: 'Payment initiation successful (simulated). Scan QR to complete.',
            qrCodeUrl: simulatedQrCodeUrl,
            transactionId: transactionId,
            status: 'pending' // Initial status returned to frontend
        });
    }, 1000); // Simulate 1-second API call
});

// --- NEW API Route for Simulated Payment Confirmation (Webhook) ---

/**
 * @route POST /api/payments/confirm
 * @description Simulates a payment gateway sending a confirmation webhook.
 * This endpoint updates the payment status of a booking to 'completed'.
 * In a real system, this would be triggered by the payment provider.
 * @body {object} confirmationDetails - Contains bookingId and optionally transactionId, status.
 * @returns {object} A success message or an error.
 */
app.post('/api/payments/confirm', async (req, res) => {
    const { bookingId } = req.body; // Expecting bookingId to identify which booking to update

    if (!bookingId) {
        return res.status(400).json({ error: 'Booking ID is required to confirm payment.' });
    }

    try {
        // Update the payment_status for the given bookingId to 'completed'
        const result = await pool.query(
            'UPDATE bookings4 SET payment_status = $1 WHERE id = $2 RETURNING *;',
            ['completed', bookingId]
        );

        if (result.rowCount === 0) {
            console.warn(`Attempted to confirm payment for non-existent booking ID: ${bookingId}`);
            return res.status(404).json({ error: `Booking with ID ${bookingId} not found for payment confirmation.` });
        }

        console.log(`Payment confirmed for Booking ID: ${bookingId}. Status updated to 'completed'.`);
        res.status(200).json({ message: `Payment for booking ID ${bookingId} confirmed successfully.` });
    } catch (err) {
        console.error('Error confirming payment for booking:', err);
        res.status(500).json({ error: 'Failed to update payment status in the database.' });
    }
});


/**
 * @route POST /api/testimonials
 * @description Create a new testimonial and save it to the database.
 * @body {object} testimonial - Testimonial details (reviewerName, reviewerEmail, reviewTitle, reviewText, rating, genuineOpinion)
 * @returns {object} The newly created testimonial object.
 */
app.post('/api/testimonials', async (req, res) => {
    const { reviewerName, reviewerEmail, reviewTitle, reviewText, rating, genuineOpinion } = req.body;

    // Basic validation
    if (!reviewerName || !reviewerEmail || !reviewText || !rating || genuineOpinion === undefined) {
        return res.status(400).json({ error: 'All testimonial fields (except title) are required.' });
    }
    if (rating < 1 || rating > 5) {
        return res.status(400).json({ error: 'Rating must be between 1 and 5.' });
    }

    try {
        // Insert the new testimonial into the 'testimonials' table
        const result = await pool.query(
            'INSERT INTO testimonials(reviewer_name, reviewer_email, review_title, review_text, rating, genuine_opinion, created_at) VALUES($1, $2, $3, $4, $5, $6, NOW()) RETURNING *;',
            [reviewerName, reviewerEmail, reviewTitle, reviewText, rating, genuineOpinion]
        );
        res.status(201).json(result.rows[0]); // Return the newly created testimonial
    } catch (err) {
        console.error('Error adding testimonial to database:', err);
        res.status(500).json({ error: 'Failed to add testimonial to the database.' });
    }
});

/**
 * @route GET /api/testimonials
 * @description Get all existing testimonials from the database, ordered by creation date descending.
 * @returns {Array} An array of testimonial objects.
 */
app.get('/api/testimonials', async (req, res) => {
    try {
        // Select all testimonials, ordered by created_at in descending order
        const result = await pool.query('SELECT * FROM testimonials ORDER BY created_at DESC;');
        res.json(result.rows);
    } catch (err) {
        console.error('Error fetching testimonials from database:', err);
        res.status(500).json({ error: 'Failed to retrieve testimonials from the database.' });
    }
});

/**
 * @route DELETE /api/testimonials/:id
 * @description Delete a testimonial from the database by its ID.
 * @param {string} id - The unique ID (review_id) of the testimonial to delete.
 * @returns {object} A success message or an error.
 */
app.delete('/api/testimonials/:id', async (req, res) => {
    const { id } = req.params; // Get the testimonial ID from the URL parameters

    try {
        // SQL query to delete a testimonial from the 'testimonials' table by review_id
        const result = await pool.query('DELETE FROM testimonials WHERE id = $1 RETURNING id;', [id]);

        // Check if any row was actually deleted
        if (result.rowCount === 0) {
            return res.status(404).json({ error: `Testimonial with ID ${id} not found.` });
        }

        res.status(200).json({ message: `Testimonial with ID ${id} deleted successfully.` });
    } catch (err) {
        // Log the full error object for more details
        console.error('Error deleting testimonial from database:', err.message || err);
        res.status(500).json({ error: `Failed to delete testimonial from the database: ${err.message || 'Unknown database error'}` });
    }
});


// --- Start the server ---
app.listen(PORT, () => {
    console.log(`Backend server running on http://localhost:${PORT}`);
    console.log('Ensure your frontend BASE_API_URL is set to this backend URL for full functionality.');
    console.log('New payment initiation endpoint available at http://localhost:3000/api/payments/initiate');
    console.log('New payment confirmation endpoint available at http://localhost:3000/api/payments/confirm');
    console.log('New testimonial submission endpoint available at http://localhost:3000/api/testimonials (POST)');
    console.log('New testimonial retrieval endpoint available at http://localhost:3000/api/testimonials (GET)');
    console.log('New testimonial deletion endpoint available at http://localhost:3000/api/testimonials/:id (DELETE)'); // Added new log
});
