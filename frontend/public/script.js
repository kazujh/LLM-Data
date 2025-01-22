let currentSessionId = null;
let uploadedFiles = [];

document.getElementById('uploadForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData();
    const fileInput = document.getElementById('fileInput');
    const submitButton = e.target.querySelector('button[type="submit"]');
    const promptElement = document.getElementById('prompt');
    
    if (!fileInput.files[0]) {
        alert('Please select a file');
        return;
    }
    
    formData.append('file', fileInput.files[0]);
    
    try {
        submitButton.disabled = true;
        submitButton.textContent = 'Uploading...';
        
        const response = await fetch('http://localhost:3000/files/upload', {
            method: 'POST',
            body: formData
        });
        
        if (!response.ok) {
            throw new Error('Upload failed');
        }
        
        const result = await response.json();
        console.log('Upload result:', result);
        
        // Clear the file input and enable prompt
        fileInput.value = '';
        promptElement.disabled = false;
        
        // Refresh the files list
        await loadFiles();
        
        alert('File uploaded successfully!');
    } catch (error) {
        console.error('Upload error:', error);
        alert('Error uploading file: ' + error.message);
    } finally {
        submitButton.disabled = false;
        submitButton.textContent = 'Upload';
    }
});

async function loadFiles() {
    try {
        const response = await fetch('http://localhost:3000/files');
        const files = await response.json();
        console.log('Loaded files:', files);
        
        const filesList = document.getElementById('filesList');
        filesList.innerHTML = files.map(file => `
            <div class="file-item" data-file-id="${file._id}">
                <input type="checkbox" id="file_${file._id}" value="${file._id}">
                <label for="file_${file._id}">${file.filename}</label>
                <button class="delete-btn" onclick="deleteFile('${file._id}')">Delete</button>
            </div>
        `).join('');
    } catch (error) {
        console.error('Error loading files:', error);
    }
}

function getSelectedFileIds() {
    const checkboxes = document.querySelectorAll('#filesList input[type="checkbox"]:checked');
    const fileIds = Array.from(checkboxes).map(cb => cb.value);
    console.log('Selected file IDs:', fileIds);
    return fileIds;
}

async function sendPrompt() {
    const promptElement = document.getElementById('prompt');
    const prompt = promptElement.value.trim();
    const responseElement = document.getElementById('response');
    
    if (!prompt) {
        alert('Please enter a prompt');
        return;
    }

    if (!currentSessionId) {
        await createChatSession();
    }

    const llmProvider = document.getElementById('llmSelect').value;
    const selectedFileIds = getSelectedFileIds();
    
    try {
        responseElement.textContent = 'Loading...';
        console.log('Selected files:', selectedFileIds);
        
        // Verify file contents are accessible
        let fileContents = [];
        if (selectedFileIds.length > 0) {
            for (const fileId of selectedFileIds) {
                console.log('Fetching content for file:', fileId);
                try {
                    const contentResponse = await fetch(`http://localhost:3000/files/${fileId}/content`, {
                        method: 'GET',
                        headers: {
                            'Accept': 'application/json',
                            'Content-Type': 'application/json'
                        }
                    });
                    
                    if (!contentResponse.ok) {
                        throw new Error(`HTTP error! status: ${contentResponse.status}`);
                    }
                    
                    const contentType = contentResponse.headers.get('content-type');
                    if (!contentType || !contentType.includes('application/json')) {
                        throw new Error(`Expected JSON response but got ${contentType}`);
                    }
                    
                    const contentData = await contentResponse.json();
                    console.log('Received file content:', {
                        fileId,
                        contentLength: contentData.content?.length || 0
                    });
                    
                    if (!contentData.content) {
                        throw new Error('File content is empty');
                    }
                    
                    fileContents.push(contentData.content);
                    console.log('File content loaded successfully');
                } catch (error) {
                    console.error('Error fetching file content:', error);
                    throw new Error(`Failed to access file content: ${error.message}`);
                }
            }
        }

        // Send prompt to LLM
        const response = await fetch('http://localhost:3000/chat/messages', {
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                sessionId: currentSessionId,
                message: prompt,
                llmProvider: llmProvider,
                fileIds: selectedFileIds
            })
        });

        if (!response.ok) {
            throw new Error(`Server error: ${response.status}`);
        }

        const result = await response.json();
        console.log('LLM Response:', result);

        responseElement.textContent = result.response || 'No response received';
        promptElement.value = '';
    } catch (error) {
        console.error('Error sending prompt:', error);
        responseElement.textContent = `Error: ${error.message}`;
    }
}

// Add this to check if session creation works
async function createChatSession() {
    try {
        console.log('Creating new chat session...');
        const response = await fetch('http://localhost:3000/chat/sessions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                userId: 'testUser',
                title: 'Test Session'
            })
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const session = await response.json();
        currentSessionId = session._id;
        console.log('Created session:', currentSessionId);
    } catch (error) {
        console.error('Error creating chat session:', error);
        throw error;
    }
}

// Add event listener for Enter key in textarea
document.getElementById('prompt').addEventListener('keypress', function(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault(); // Prevent default to avoid new line
        sendPrompt();
    }
});

// Initialize the page
document.addEventListener('DOMContentLoaded', async () => {
    const promptElement = document.getElementById('prompt');
    promptElement.disabled = false; // Ensure prompt is enabled by default
    
    await createChatSession();
    await loadFiles();
});

async function deleteFile(fileId) {
    if (!fileId) {
        console.error('No file ID provided');
        return;
    }

    if (!confirm('Are you sure you want to delete this file?')) {
        return;
    }

    try {
        console.log('Attempting to delete file:', fileId);
        const response = await fetch(`http://localhost:3000/files/${fileId}`, {
            method: 'DELETE',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Server response:', errorText);
            throw new Error(`Server error: ${response.status}`);
        }

        const result = await response.json();
        console.log('Delete response:', result);

        // Remove the file element from DOM
        const fileElement = document.querySelector(`[data-file-id="${fileId}"]`);
        if (fileElement) {
            fileElement.remove();
        }

        // Also refresh the full list to ensure consistency
        await loadFiles();
        alert('File deleted successfully');
    } catch (error) {
        console.error('Error deleting file:', error);
        alert('Error deleting file: ' + error.message);
    }
}

