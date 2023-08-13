// Create web server
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const { randomBytes } = require('crypto');
const axios = require('axios');
// Create app
const app = express();
// Add middleware
app.use(bodyParser.json());
app.use(cors());
// Create comments object
const commentsByPostId = {};
// Get all comments
app.get('/posts/:id/comments', (req, res) => {
    // Return comments
    res.send(commentsByPostId[req.params.id] || []);
});
// Add comment
app.post('/posts/:id/comments', async (req, res) => {
    // Create id
    const commentId = randomBytes(4).toString('hex');
    // Get content and status
    const { content } = req.body;
    // Get comments
    const comments = commentsByPostId[req.params.id] || [];
    // Add comment
    comments.push({ id: commentId, content, status: 'pending' });
    // Update comments
    commentsByPostId[req.params.id] = comments;
    // Send event
    await axios.post('http://event-bus-srv:4005/events', {
        type: 'CommentCreated',
        data: {
            id: commentId,
            content,
            postId: req.params.id,
            status: 'pending'
        }
    });
    // Return comments
    res.status(201).send(comments);
});
// Event handler
app.post('/events', async (req, res) => {
    // Get type and data
    const { type, data } = req.body;
    // Check type
    if (type === 'CommentModerated') {
        // Get comment
        const comment = commentsByPostId[data.postId].find(comment => comment.id === data.id);
        // Update status
        comment.status = data.status;
        // Send event
        await axios.post('http://event-bus-srv:4005/events', {
            type: 'CommentUpdated',
            data: {
                id: data.id,
                content: data.content,
                postId: data.postId,
                status: data.status
            }
        });
    }
    // Send response
    res.send({});
});
// Listen on port 4001
app.listen(4001, () => {
    console.log('Listening on 4001');
});