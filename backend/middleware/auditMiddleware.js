const Activity = require('../models/Activity');

const getActionDescription = (req) => {
  const { method, originalUrl } = req;
  const path = originalUrl.split('?')[0]; // Remove query params

  if (path.includes('/api/users/login')) return 'User Logged In';
  if (path === '/api/users' && method === 'POST') return `Created User: ${req.body.name || 'New'}`;
  if (path.includes('/api/users/') && method === 'DELETE') return req.deletedUserName ? `Deleted User: ${req.deletedUserName}` : 'Deleted User';
  if (path === '/api/users/profile' && method === 'PUT') return 'Updated Own Profile/Password';
  if (path === '/api/users/clear-business-data' && method === 'POST') return 'Cleared Business Data';
  
  // Machine actions
  if (path === '/api/machines' && method === 'POST') return `Created Machine: ${req.body.name || 'New'}`;
  if (path.includes('/api/machines/') && method === 'PUT') return `Updated Machine: ${req.params.id}`;
  if (path.includes('/api/machines/') && method === 'DELETE') return `Deleted Machine: ${req.params.id}`;

  // Operator table actions
  if (path === '/api/operator-table' && method === 'PUT') return 'Updated Operator Table Configuration';
  if (path === '/api/operator-table/reset' && method === 'POST') return 'Reset Operator Table Configuration';

  // Default to Method + Path
  return `${method} ${path}`;
};

const auditLogger = async (req, res, next) => {
  const methodsToLog = ['POST', 'PUT', 'DELETE'];

  if (methodsToLog.includes(req.method)) {
    const resSend = res.send;

    res.send = function (content) {
      // Only log if we have a user (from protect middleware) and successful response
      if (req.user && res.statusCode >= 200 && res.statusCode < 300) {
        const activity = {
          user: req.user._id,
          action: getActionDescription(req),
          method: req.method,
          resource: req.originalUrl.split('/')[2] || 'system',
          details: req.method !== 'DELETE' ? JSON.stringify(req.body) : `Deleted Resource ID: ${req.params.id || 'N/A'}`,
          isSuccess: true,
        };

        // Fire and forget logging
        Activity.create(activity).catch(err => console.error('Audit Log Error:', err));
      }
      return resSend.apply(res, arguments);
    };
  }

  next();
};

module.exports = auditLogger;
