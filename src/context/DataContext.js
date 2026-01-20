"use client";
import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';
import Cookies from 'js-cookie';


import { DemoStoreData } from '@/data/demoStore';

const DataContext = createContext();

export const useData = () => {
    const context = useContext(DataContext);
    if (!context) {
        throw new Error("useData must be used within a DataProvider");
    }
    return context;
};

// Simple global cache for categories to avoid refetching too often
let cachedCategories = [];

export const DataProvider = ({ children }) => {
    const [clients, setClients] = useState([]);
    const [products, setProducts] = useState([]);
    const [isLoaded, setIsLoaded] = useState(false);

    const api = axios.create({
        baseURL: 'https://sistema-api.znmwnf.easypanel.host/api'
    });

    api.interceptors.request.use((config) => {
        const token = Cookies.get('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    });

    // Initialize
    // Initialize
    useEffect(() => {
        const fetchData = async () => {
            try {
                const clientsRes = await api.get('/clients');
                // Fetch products for all clients (or restructure API to get all products if needed)
                // For now, let's assume we load products when needed or fetch all if endpoint exists
                // But wait, the dashboard counts ALL products.
                // Let's stick to clients for now and maybe fetch products per client if needed?
                // Actually, the previous implementation loaded products into a global state? 
                // No, it separated them. 
                // Let's look at how loadProducts works.

                // We need to fetch clients. The clients endpoint returns clients.
                // If we need products for the dashboard, we need to ensure the client response includes them.
                // The service ALREADY includes products in findAll.

                setClients(clientsRes.data);

                // We might not need a separate products state if they are embedded in clients.
                // But getProductsByClientId uses 'products' state.
                // Let's populate 'products' state from the clients' products to keep compatibility.
                const allProducts = clientsRes.data.flatMap(c => c.products || []).map(p => ({ ...p, isActive: true }));
                setProducts(allProducts);

            } catch (error) {
                console.error("Failed to fetch data", error);
            } finally {
                setIsLoaded(true);
            }
        };

        fetchData();
    }, []);

    // Sync - REMOVED (No local storage sync needed)

    // --- Actions ---

    const addClient = async (newClient) => {
        try {
            const res = await api.post('/clients', newClient);
            setClients(prev => [...prev, { ...res.data, isActive: true }]);
            // We can also initialize empty products for this new client
            // But usually the response doesn't contain products yet.
        } catch (error) {
            console.error("Error creating client:", error);
            throw error;
        }
    };

    const toggleClientStatus = async (clientId) => {
        try {
            const client = clients.find(c => c.id === clientId);
            if (!client) return;

            const res = await api.put(`/clients/${clientId}`, { isActive: !client.isActive });

            setClients(prev => prev.map(c =>
                c.id === clientId ? { ...c, isActive: res.data.isActive } : c
            ));
        } catch (error) {
            console.error("Error toggling client status:", error);
            throw error;
        }
    };

    const updateClient = async (clientId, data) => {
        try {
            const res = await api.put(`/clients/${clientId}`, data);
            setClients(prev => prev.map(c =>
                c.id === clientId ? { ...c, ...res.data } : c
            ));
            return res.data;
        } catch (error) {
            console.error("Error updating client:", error);
            throw error;
        }
    };

    const getClientBySlug = (slug) => {
        if (slug === 'demo-store') return DemoStoreData;
        return clients.find(c => c.slug === slug);
    };

    // Product Actions
    const getProductsByClientId = (clientId) => {
        return products.filter(p => p.clientId === clientId);
    };

    // Placeholder for backward compatibility if needed, or implement specific fetch
    const loadProducts = async (clientSlug) => {
        // Since we fetch all data on mount, this might be redundant unless we want to refresh.
        // For now, let's make it safe.
        // We could re-trigger fetchData() here if we wanted.
    };

    const addProduct = async (clientId, productData) => {
        try {
            const res = await api.post(`/clients/${clientId}/products`, productData);
            setProducts(prev => [...prev, { ...res.data, isActive: true }]);

            // Also update the client's products list locally to reflect the count in dashboard
            setClients(prev => prev.map(c =>
                c.id === clientId
                    ? { ...c, products: [...(c.products || []), res.data] }
                    : c
            ));
        } catch (error) {
            console.error("Error creating product:", error);
            throw error;
        }
    };

    const importProducts = async (clientId, productsArray) => {
        try {
            const res = await api.post(`/clients/${clientId}/products/bulk-import`, productsArray);

            // Refetch clients to update product list completely or append locally if simpler
            // For bulk, better to re-fetch to ensure consistency
            const clientsRes = await api.get('/clients');
            setClients(clientsRes.data);
            const allProducts = clientsRes.data.flatMap(c => c.products || []).map(p => ({ ...p, isActive: true }));
            setProducts(allProducts);

            return res.data;
        } catch (error) {
            console.error("Error importing products:", error);
            throw error;
        }
    };

    // Global Search & Categories
    const searchGlobalProducts = async (query) => {
        try {
            const res = await api.get(`/products/global-search?query=${encodeURIComponent(query)}`);
            return res.data;
        } catch (error) {
            console.error("Error searching global products:", error);
            return [];
        }
    };

    const getCategories = async () => {
        if (cachedCategories.length > 0) return cachedCategories;
        try {
            const res = await api.get('/products/categories');
            cachedCategories = res.data;
            return res.data;
        } catch (error) {
            console.error("Error fetching categories:", error);
            return [];
        }
    };

    const getDashboardStats = async () => {
        try {
            const res = await api.get('/stats/dashboard');
            return res.data;
        } catch (error) {
            console.error("Error fetching dashboard stats:", error);
            throw error;
        }
    };

    const updateProduct = (productId, updatedData) => {
        setProducts(prev => prev.map(p => p.id === productId ? { ...p, ...updatedData } : p));
    };

    const toggleProductStatus = (productId) => {
        setProducts(prev => prev.map(p => p.id === productId ? { ...p, isActive: !p.isActive } : p));
    };

    const bulkImportClients = async (clientsData) => {
        try {
            const res = await api.post('/clients/bulk-import', clientsData);

            // Refresh clients completely to show new data
            const clientsRes = await api.get('/clients');
            setClients(clientsRes.data);
            const allProducts = clientsRes.data.flatMap(c => c.products || []).map(p => ({ ...p, isActive: true }));
            setProducts(allProducts);

            return res.data;
        } catch (error) {
            console.error("Error bulk importing clients:", error);
            throw error;
        }
    };

    return (
        <DataContext.Provider value={{
            clients,
            products,
            addClient,
            updateClient,
            toggleClientStatus,
            getClientBySlug,
            getProductsByClientId,
            loadProducts,
            addProduct,
            importProducts,
            bulkImportClients, // Feature: Bulk Client Creation
            searchGlobalProducts,
            getCategories,
            getDashboardStats,
            updateProduct,
            toggleProductStatus,
            isLoaded
        }}>
            {children}
        </DataContext.Provider>
    );
};
