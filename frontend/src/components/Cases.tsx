import React, { useState, useEffect } from 'react';
import Navigation from './Navigation';
import { casesApi } from '../services/api';
import type { Case } from '../types';

const Cases: React.FC = () => {
  const [cases, setCases] = useState<Case[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [showModal, setShowModal] = useState<boolean>(false);
  const [selectedCase, setSelectedCase] = useState<Case | null>(null);
  const [filters, setFilters] = useState({
    status: '',
    priority: '',
    search: '',
  });
  const [formData, setFormData] = useState<Partial<Case>>({
    case_number: '',
    customer_name: '',
    customer_email: '',
    customer_phone: '',
    case_type: '',
    priority: 'medium',
    description: '',
  });

  useEffect(() => {
    loadCases();
  }, [filters]);

  const loadCases = async () => {
    setLoading(true);
    try {
      const data = await casesApi.getCases(filters);
      setCases(data);
    } catch (err) {
      console.error('Error loading cases:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCase = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await casesApi.createCase(formData);
      setShowModal(false);
      setFormData({
        case_number: '',
        customer_name: '',
        customer_email: '',
        customer_phone: '',
        case_type: '',
        priority: 'medium',
        description: '',
      });
      loadCases();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to create case');
    }
  };

  const handleUpdateStatus = async (id: number, status: string) => {
    try {
      await casesApi.updateCase(id, { status });
      loadCases();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to update case');
    }
  };

  const getStatusBadge = (status: string) => {
    const badges: Record<string, string> = {
      open: 'badge-info',
      in_progress: 'badge-warning',
      resolved: 'badge-success',
      closed: 'badge-secondary',
    };
    return badges[status] || 'badge-secondary';
  };

  const getPriorityBadge = (priority: string) => {
    const badges: Record<string, string> = {
      high: 'badge-danger',
      medium: 'badge-warning',
      low: 'badge-success',
    };
    return badges[priority] || 'badge-secondary';
  };

  return (
    <>
      <Navigation />
      <div className="container mt-8">
        <div className="flex justify-between items-center mb-4">
          <h1>Cases</h1>
          <button className="btn btn-primary" onClick={() => setShowModal(true)}>
            Create Case
          </button>
        </div>

        <div className="card mb-4">
          <div className="grid grid-cols-3">
            <div className="form-group">
              <label className="form-label">Status</label>
              <select
                className="form-select"
                value={filters.status}
                onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              >
                <option value="">All</option>
                <option value="open">Open</option>
                <option value="in_progress">In Progress</option>
                <option value="resolved">Resolved</option>
                <option value="closed">Closed</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Priority</label>
              <select
                className="form-select"
                value={filters.priority}
                onChange={(e) => setFilters({ ...filters, priority: e.target.value })}
              >
                <option value="">All</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Search</label>
              <input
                type="text"
                className="form-input"
                placeholder="Case number, customer..."
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              />
            </div>
          </div>
        </div>

        <div className="card">
          {loading ? (
            <div className="flex items-center justify-center p-8">
              <div className="spinner"></div>
            </div>
          ) : cases.length === 0 ? (
            <p className="text-secondary text-center p-4">No cases found.</p>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>Case Number</th>
                  <th>Customer</th>
                  <th>Type</th>
                  <th>Priority</th>
                  <th>Status</th>
                  <th>Assigned To</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {cases.map((c) => (
                  <tr key={c.id}>
                    <td className="font-semibold">{c.case_number}</td>
                    <td>
                      <div>{c.customer_name}</div>
                      {c.customer_email && (
                        <div className="text-sm text-secondary">{c.customer_email}</div>
                      )}
                    </td>
                    <td>{c.case_type}</td>
                    <td>
                      <span className={`badge ${getPriorityBadge(c.priority)}`}>
                        {c.priority}
                      </span>
                    </td>
                    <td>
                      <span className={`badge ${getStatusBadge(c.status)}`}>
                        {c.status}
                      </span>
                    </td>
                    <td>{c.assigned_to_name || '-'}</td>
                    <td>
                      <select
                        className="form-select"
                        value={c.status}
                        onChange={(e) => handleUpdateStatus(c.id, e.target.value)}
                      >
                        <option value="open">Open</option>
                        <option value="in_progress">In Progress</option>
                        <option value="resolved">Resolved</option>
                        <option value="closed">Closed</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Create New Case</h2>
              <button
                className="btn btn-sm btn-secondary"
                onClick={() => setShowModal(false)}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateCase}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Case Number *</label>
                  <input
                    type="text"
                    className="form-input"
                    value={formData.case_number}
                    onChange={(e) =>
                      setFormData({ ...formData, case_number: e.target.value })
                    }
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Customer Name *</label>
                  <input
                    type="text"
                    className="form-input"
                    value={formData.customer_name}
                    onChange={(e) =>
                      setFormData({ ...formData, customer_name: e.target.value })
                    }
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Customer Email</label>
                  <input
                    type="email"
                    className="form-input"
                    value={formData.customer_email}
                    onChange={(e) =>
                      setFormData({ ...formData, customer_email: e.target.value })
                    }
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Customer Phone</label>
                  <input
                    type="tel"
                    className="form-input"
                    value={formData.customer_phone}
                    onChange={(e) =>
                      setFormData({ ...formData, customer_phone: e.target.value })
                    }
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Case Type *</label>
                  <input
                    type="text"
                    className="form-input"
                    value={formData.case_type}
                    onChange={(e) =>
                      setFormData({ ...formData, case_type: e.target.value })
                    }
                    placeholder="e.g., Technical Support, Billing"
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Priority</label>
                  <select
                    className="form-select"
                    value={formData.priority}
                    onChange={(e) =>
                      setFormData({ ...formData, priority: e.target.value })
                    }
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Description</label>
                  <textarea
                    className="form-textarea"
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                  ></textarea>
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Create Case
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default Cases;
