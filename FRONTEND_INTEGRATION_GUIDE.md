# Frontend Integration Guide - For Your Development Team

This guide shows how developers can consume the fraud detection API and WebSocket events in their own frontend applications.

---

## 📋 Table of Contents

1. [REST API Integration](#rest-api-integration)
2. [WebSocket Real-Time Events](#websocket-real-time-events)
3. [Complete Examples](#complete-examples)
4. [Error Handling](#error-handling)
5. [Performance Tips](#performance-tips)

---

## REST API Integration

### Base URL
```
Production: https://your-app.up.railway.app/api/v1
Development: http://localhost:3000/api/v1
```

### Authentication
- ✅ Currently NO authentication required (add JWT for production)
- Rate limit: 100 requests per minute per IP

### Endpoints

#### 1. Create Transaction
**POST** `/api/v1/transactions`

```javascript
const createTransaction = async (transactionData) => {
  try {
    const response = await fetch(
      `${process.env.REACT_APP_API_URL}/transactions`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: 10000,
          senderId: 'user123',
          recipientId: 'user456',
          paymentMethod: 'UPI',  // or CARD, NET_BANKING
          timestamp: new Date().toISOString(),
          deviceId: 'device789'
        })
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const transaction = await response.json();
    return transaction;
  } catch (error) {
    console.error('Error creating transaction:', error);
    throw error;
  }
};

// Usage
try {
  const txn = await createTransaction({
    amount: 50000,
    senderId: 'user_123',
    recipientId: 'user_456',
    paymentMethod: 'UPI'
  });
  console.log('Transaction created:', txn);
  console.log('Risk Score:', txn.riskScore);
  console.log('Fraud Alert:', txn.flagged);
} catch (error) {
  console.error('Failed:', error);
}
```

**Sample Response (Success):**
```json
{
  "_id": "6616a1b2c3d4e5f6g7h8i9j0",
  "amount": 50000,
  "senderId": "user_123",
  "recipientId": "user_456",
  "paymentMethod": "UPI",
  "timestamp": "2024-04-14T10:30:00.000Z",
  "riskScore": 45,
  "riskLevel": "MEDIUM",
  "fraudProbability": 0.35,
  "flaggedRules": ["new_recipient"],
  "rules": [
    {
      "name": "new_recipient",
      "score": 15,
      "triggered": true,
      "reason": "First time transfer to this recipient"
    },
    {
      "name": "high_amount",
      "score": 0,
      "triggered": false
    }
  ],
  "createdAt": "2024-04-14T10:30:05.000Z",
  "status": "PROCESSED"
}
```

---

#### 2. Get All Transactions
**GET** `/api/v1/transactions`

```javascript
// Fetch with pagination
const getTransactions = async (page = 0, limit = 20) => {
  try {
    const response = await fetch(
      `${process.env.REACT_APP_API_URL}/transactions?skip=${page * limit}&limit=${limit}`,
      {
        method: 'GET'
      }
    );
    const transactions = await response.json();
    return transactions;
  } catch (error) {
    console.error('Error fetching transactions:', error);
    throw error;
  }
};

// Filter by risk level
const getHighRiskTransactions = async () => {
  try {
    const response = await fetch(
      `${process.env.REACT_APP_API_URL}/transactions?riskLevel=HIGH`
    );
    return await response.json();
  } catch (error) {
    console.error('Error:', error);
    throw error;
  }
};

// Usage
const txns = await getTransactions(0, 50);
console.log(`Total transactions: ${txns.length}`);
txns.forEach(txn => {
  console.log(`${txn.amount} - Risk: ${txn.riskScore}%`);
});
```

**Query Parameters:**
- `skip`: Number of records to skip (default: 0)
- `limit`: Max records to return (default: 20, max: 100)
- `riskLevel`: Filter by 'HIGH', 'MEDIUM', or 'LOW'
- `status`: Filter by status

---

#### 3. Get Transaction by ID
**GET** `/api/v1/transactions/:id`

```javascript
const getTransactionById = async (id) => {
  try {
    const response = await fetch(
      `${process.env.REACT_APP_API_URL}/transactions/${id}`
    );
    if (!response.ok) throw new Error('Transaction not found');
    return await response.json();
  } catch (error) {
    console.error('Error:', error);
    throw error;
  }
};

// Usage
const txn = await getTransactionById('6616a1b2c3d4e5f6g7h8i9j0');
console.log('Transaction details:', txn);
```

---

#### 4. Health Check
**GET** `/api/v1/health`

```javascript
const checkHealth = async () => {
  try {
    const response = await fetch(
      `${process.env.REACT_APP_API_URL}/health`
    );
    return await response.json();
  } catch (error) {
    console.error('API is down:', error);
    return { status: 'error' };
  }
};

// Usage
const health = await checkHealth();
if (health.status === 'ok') {
  console.log('✅ API is running');
} else {
  console.log('❌ API is down');
}
```

---

## WebSocket Real-Time Events

### Connection Setup

```javascript
import io from 'socket.io-client';

// Initialize connection
const socket = io(
  process.env.REACT_APP_API_URL,
  {
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    reconnectionAttempts: 5,
    transports: ['websocket', 'polling']
  }
);

// Connection lifecycle
socket.on('connect', () => {
  console.log('✅ Connected to server');
});

socket.on('disconnect', () => {
  console.log('❌ Disconnected from server');
});

socket.on('error', (error) => {
  console.error('⚠️ WebSocket error:', error);
});
```

### Event Types

#### 1. Fraud Alert Event
Fires when transaction risk score exceeds threshold

```javascript
socket.on('fraud-alert', (data) => {
  console.log('🚨 FRAUD ALERT!', {
    transactionId: data._id,
    amount: data.amount,
    riskScore: data.riskScore,
    fraudProbability: data.fraudProbability,
    message: data.message,
    flaggedRules: data.flaggedRules,
    alertTime: data.timestamp
  });

  // Update UI
  updateAlertPanel(data);
  playAlertSound();  // Optional
  sendNotification(data);  // Optional
});
```

**Sample Alert Data:**
```json
{
  "_id": "6616a1b2c3d4e5f6g7h8i9j0",
  "amount": 150000,
  "senderId": "user_123",
  "recipientId": "user_999",
  "riskScore": 85,
  "riskLevel": "HIGH",
  "fraudProbability": 0.92,
  "message": "High-risk transaction detected: Large amount to new recipient",
  "flaggedRules": ["high_amount", "new_recipient", "unusual_pattern"],
  "timestamp": "2024-04-14T10:30:00Z"
}
```

---

#### 2. Transaction Scored Event
Fires for every transaction (regardless of risk)

```javascript
socket.on('txn-scored', (data) => {
  console.log('📊 Transaction scored:', {
    id: data._id,
    amount: data.amount,
    riskScore: data.riskScore,
    status: 'processed'
  });

  // Add to UI transaction list
  addTransactionToTable(data);
});
```

---

#### 3. Stats Update Event
Fires periodically with aggregated statistics

```javascript
socket.on('stats-update', (data) => {
  console.log('📈 Stats update:', {
    totalTransactions: data.totalTransactions,
    highRiskCount: data.highRiskCount,
    averageRiskScore: data.avgRiskScore,
    lastUpdateTime: data.timestamp
  });

  // Update dashboard stats
  updateStatsPanel(data);
});
```

**Sample Stats:**
```json
{
  "totalTransactions": 2547,
  "highRiskCount": 89,
  "mediumRiskCount": 234,
  "lowRiskCount": 2224,
  "avgRiskScore": 42.5,
  "fraudDetectionRate": 0.035,
  "timestamp": "2024-04-14T10:30:00Z"
}
```

---

## Complete Examples

### Example 1: React Hook for API Calls

```javascript
// hooks/useFraudAPI.js
import { useState, useCallback } from 'react';

export const useFraudAPI = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const API_URL = process.env.REACT_APP_API_URL;

  const createTransaction = useCallback(async (txnData) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_URL}/transactions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(txnData)
      });
      if (!response.ok) throw new Error('Failed to create transaction');
      return await response.json();
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [API_URL]);

  const getTransactions = useCallback(async (skip = 0, limit = 20) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(
        `${API_URL}/transactions?skip=${skip}&limit=${limit}`
      );
      return await response.json();
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [API_URL]);

  return { createTransaction, getTransactions, loading, error };
};

// Usage in component
import { useFraudAPI } from './hooks/useFraudAPI';

function MyComponent() {
  const { createTransaction, getTransactions, loading, error } = useFraudAPI();

  return (
    <div>
      {error && <div style={{ color: 'red' }}>Error: {error}</div>}
      {loading && <div>Loading...</div>}
      {/* Your JSX */}
    </div>
  );
}
```

---

### Example 2: React Context for WebSocket

```javascript
// context/FraudContext.js
import React, { createContext, useEffect, useState } from 'react';
import io from 'socket.io-client';

export const FraudContext = createContext();

export function FraudProvider({ children }) {
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [alerts, setAlerts] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [stats, setStats] = useState(null);

  useEffect(() => {
    const newSocket = io(process.env.REACT_APP_API_URL);

    newSocket.on('connect', () => setIsConnected(true));
    newSocket.on('disconnect', () => setIsConnected(false));

    newSocket.on('fraud-alert', (data) => {
      setAlerts(prev => [data, ...prev.slice(0, 49)]);
    });

    newSocket.on('txn-scored', (data) => {
      setTransactions(prev => [data, ...prev.slice(0, 99)]);
    });

    newSocket.on('stats-update', setStats);

    setSocket(newSocket);
    return () => newSocket.close();
  }, []);

  return (
    <FraudContext.Provider value={{ isConnected, alerts, transactions, stats }}>
      {children}
    </FraudContext.Provider>
  );
}

// Usage in component
import { useContext } from 'react';
import { FraudContext } from './context/FraudContext';

function Dashboard() {
  const { isConnected, alerts, transactions, stats } = useContext(FraudContext);
  
  return (
    <div>
      <p>Status: {isConnected ? '✅ Connected' : '❌ Disconnected'}</p>
      <p>Alerts: {alerts.length}</p>
      {/* ... */}
    </div>
  );
}
```

---

### Example 3: Vue.js Integration

```vue
<!-- Dashboard.vue -->
<template>
  <div class="dashboard">
    <div class="status">{{ connectionStatus }}</div>
    
    <div class="form">
      <input v-model.number="form.amount" placeholder="Amount" />
      <input v-model="form.senderId" placeholder="Sender ID" />
      <input v-model="form.recipientId" placeholder="Recipient ID" />
      <button @click="submitTransaction" :disabled="loading">Submit</button>
    </div>

    <div class="alerts">
      <h2>Alerts ({{ alerts.length }})</h2>
      <div v-for="alert in alerts" :key="alert._id" class="alert-item">
        🚨 {{alert.message}} - Risk: {{alert.riskScore}}%
      </div>
    </div>

    <div class="transactions">
      <h2>Transactions ({{ transactions.length }})</h2>
      <table>
        <tr v-for="txn in transactions" :key="txn._id">
          <td>₹{{ txn.amount }}</td>
          <td>{{ txn.riskScore }}</td>
          <td>{{ txn.riskLevel }}</td>
        </tr>
      </table>
    </div>
  </div>
</template>

<script>
import io from 'socket.io-client';

export default {
  name: 'Dashboard',
  data() {
    return {
      socket: null,
      connectionStatus: 'Connecting...',
      alerts: [],
      transactions: [],
      stats: null,
      loading: false,
      form: {
        amount: 1000,
        senderId: '',
        recipientId: ''
      }
    };
  },
  mounted() {
    this.socket = io(process.env.VUE_APP_API_URL);

    this.socket.on('connect', () => {
      this.connectionStatus = '✅ Connected';
    });

    this.socket.on('fraud-alert', (data) => {
      this.alerts.unshift(data);
    });

    this.socket.on('txn-scored', (data) => {
      this.transactions.unshift(data);
    });
  },
  destroyed() {
    this.socket.close();
  },
  methods: {
    async submitTransaction() {
      this.loading = true;
      try {
        const response = await fetch(
          `${process.env.VUE_APP_API_URL}/transactions`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(this.form)
          }
        );
        await response.json();
      } finally {
        this.loading = false;
      }
    }
  }
};
</script>
```

---

## Error Handling

### Retry Logic

```javascript
const fetchWithRetry = async (url, options = {}, maxRetries = 3) => {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch(url, options);
      if (response.ok) return response;
      if (response.status === 503) throw new Error('Service unavailable');
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await new Promise(r => setTimeout(r, 1000 * (i + 1)));
    }
  }
};

// Usage
try {
  const txn = await fetchWithRetry(
    `${API_URL}/transactions`,
    {
      method: 'POST',
      body: JSON.stringify(data)
    }
  );
} catch (error) {
  console.error('Failed after retries:', error);
}
```

---

### Error Boundaries (React)

```javascript
// ErrorBoundary.js
class ErrorBoundary extends React.Component {
  state = { hasError: false };

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return <h2>API Error - Try refreshing</h2>;
    }
    return this.props.children;
  }
}

// Usage
<ErrorBoundary>
  <Dashboard />
</ErrorBoundary>
```

---

## Performance Tips

### 1. Debounce Transaction Submissions
```javascript
import { debounce } from 'lodash';

const debouncedSubmit = debounce((data) => {
  createTransaction(data);
}, 1000);
```

### 2. Pagination for Large Datasets
```javascript
const [page, setPage] = useState(0);
const [pageSize] = useState(50);

const loadMore = async () => {
  const txns = await getTransactions(page * pageSize, pageSize);
  setTransactions(prev => [...prev, ...txns]);
  setPage(prev => prev + 1);
};
```

### 3. Cache Responses
```javascript
const transactionCache = new Map();

const getTransactionCached = async (id) => {
  if (transactionCache.has(id)) {
    return transactionCache.get(id);
  }
  const txn = await getTransactionById(id);
  transactionCache.set(id, txn);
  return txn;
};
```

### 4. Virtual Scrolling (React)
```javascript
import { FixedSizeList } from 'react-window';

function TransactionList({ transactions }) {
  return (
    <FixedSizeList
      height={600}
      itemCount={transactions.length}
      itemSize={50}
    >
      {({ index, style }) => (
        <div style={style}>
          {transactions[index].amount}
        </div>
      )}
    </FixedSizeList>
  );
}
```

---

## TypeScript Support

```typescript
// types/fraud-api.ts
export interface Transaction {
  _id: string;
  amount: number;
  senderId: string;
  recipientId: string;
  riskScore: number;
  riskLevel: 'HIGH' | 'MEDIUM' | 'LOW';
  fraudProbability: number;
  flaggedRules: string[];
  timestamp: Date;
}

export interface FraudAlert {
  _id: string;
  transactionId: string;
  message: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM';
}

// Use in React
const createTransaction = async (data: Omit<Transaction, '_id' | 'riskScore' | 'riskLevel'>): Promise<Transaction> => {
  const response = await fetch(`${API_URL}/transactions`, {
    method: 'POST',
    body: JSON.stringify(data)
  });
  return response.json();
};
```

---

## Testing

```javascript
// Example test with Jest
describe('Fraud API', () => {
  test('should create transaction', async () => {
    const result = await createTransaction({
      amount: 1000,
      senderId: 'user1',
      recipientId: 'user2'
    });
    
    expect(result).toHaveProperty('riskScore');
    expect(result.riskScore).toBeGreaterThanOrEqual(0);
    expect(result.riskScore).toBeLessThanOrEqual(100);
  });

  test('should fetch transactions', async () => {
    const txns = await getTransactions(0, 10);
    expect(Array.isArray(txns)).toBe(true);
  });
});
```

---

## Support

- Full docs: [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md)
- API Swagger: `https://your-backend/api/v1/docs`
- Sample component: [SAMPLE_FRONTEND_COMPONENT.jsx](./SAMPLE_FRONTEND_COMPONENT.jsx)
