const { auth } = require('./auth');

// Roles that can approve break requests
const APPROVER_ROLES = ['Supervisor', 'Team Leader', 'Coordinator', 'Admin'];

const isApprover = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Not authenticated' });
  }
  if (!APPROVER_ROLES.includes(req.user.role)) {
    return res.status(403).json({ message: 'Only Supervisors, Team Leaders, and Coordinators can approve breaks' });
  }
  next();
};

const isAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Not authenticated' });
  }
  if (req.user.role !== 'Admin') {
    return res.status(403).json({ message: 'Admin access required' });
  }
  next();
};

module.exports = { isApprover, isAdmin, APPROVER_ROLES };
