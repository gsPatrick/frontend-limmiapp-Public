"use client";
import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useData } from '@/context/DataContext';
import Button from '@/components/ui/Button/Button';
import { Plus, ArrowLeft, Power, Package, Edit2, ExternalLink, Settings, Save, Download } from 'lucide-react';
import Link from 'next/link';
import styles from './page.module.css';
import { useToast } from '@/components/ui/Toast/ToastProvider';

export default function AdminClientDetail() {
    const params = useParams();
    const router = useRouter();
    const { getClientBySlug, updateClient, toggleClientStatus, getProductsByClientId, toggleProductStatus, isLoaded } = useData();
    const { addToast } = useToast();

    const [client, setClient] = useState(null);
    const [products, setProducts] = useState([]);

    // Settings State
    const [activeTab, setActiveTab] = useState('products'); // 'products' or 'settings'
    const [description, setDescription] = useState("");
    const [coverImages, setCoverImages] = useState([]); // Array for Uploader, but we use first one
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (isLoaded && params?.clientSlug) {
            const found = getClientBySlug(params.clientSlug);
            setClient(found);
            if (found) {
                setDescription(found.description || "");
                setCoverImages(found.coverImage ? [found.coverImage] : []);
            }
        }
    }, [isLoaded, params, getClientBySlug]);

    // Handle Settings Save (We need a new updateClient method in Context, but for now we might need to add it)
    const handleSaveSettings = async () => {
        setSaving(true);
        // We need to implement updateClient in DataContext or call API directly
        try {
            // Check if updateClient exists, if not, we might need to add it or do direct axios
            // For now, assuming we will add updateClient to context or use axios here if context is missing it
            // Let's use direct axios for speed if context doesn't have it, but context is cleaner.
            // I'll check DataContext next tool call.
            // Let's assume we add it. 
        } catch (error) {
            console.error(error);
        }
        setSaving(false);
    };

    const handleExportProducts = () => {
        if (!products.length) return;

        // CSV Header
        const headers = ["Nome do Produto", "URL do Produto"];

        // CSV Rows
        const rows = products.map(product => {
            const url = `${window.location.origin}/${client.slug}/${product.slug}`;
            // Escape quotes and wrap in quotes to handle commas in names
            const safeName = `"${product.name.replace(/"/g, '""')}"`;
            return [safeName, url].join(',');
        });

        // Combine with BOM for Excel UTF-8 compatibility
        const csvContent = "\uFEFF" + [headers.join(','), ...rows].join('\n');

        // Create Blob and trigger download
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);

        link.setAttribute('href', url);
        link.setAttribute('download', `${client.slug}_produtos.csv`);
        link.style.visibility = 'hidden';

        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    useEffect(() => {
        if (client) {
            setProducts(getProductsByClientId(client.id));
        }
    }, [client, getProductsByClientId]); // Sync local state with context products

    if (!isLoaded || !client) return <div className={styles.loading}>Carregando...</div>;

    const handleToggleStatus = () => {
        toggleClientStatus(client.id);
        addToast(`Loja ${client.isActive ? 'desativada' : 'ativada'} com sucesso.`, "info");
    };

    return (
        <div className={styles.container}>
            <div className={styles.topBar}>
                <Link href="/admin/clients" className={styles.backLink}>
                    <ArrowLeft size={16} /> Voltar para Clientes
                </Link>
            </div>

            <header className={styles.header}>
                <div>
                    <h1 className={styles.title}>{client.name}</h1>
                    <div className={styles.subtitle}>
                        <span style={{ fontFamily: 'monospace', background: '#f1f5f9', padding: '2px 6px', borderRadius: '4px' }}>
                            /{client.slug}
                        </span>
                        <a href={`/${client.slug}`} target="_blank" className={styles.externalLink} title="Ver Loja Pública">
                            <ExternalLink size={16} />
                        </a>
                        <span className={`${styles.statusBadge} ${client.isActive ? styles.active : styles.inactive}`}>
                            {client.isActive ? "Loja Ativa" : "Loja Inativa"}
                        </span>
                    </div>
                </div>

                <div className={styles.headerActions}>
                    <Button
                        variant={client.isActive ? "secondary" : "primary"}
                        icon={Power}
                        onClick={handleToggleStatus}
                    >
                        {client.isActive ? "Desativar Loja" : "Ativar Loja"}
                    </Button>
                </div>
            </header>

            <div className={styles.tabs} style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', borderBottom: '1px solid #e2e8f0' }}>
                <button
                    onClick={() => setActiveTab('products')}
                    style={{
                        padding: '1rem',
                        borderBottom: activeTab === 'products' ? '2px solid #2563eb' : 'none',
                        color: activeTab === 'products' ? '#2563eb' : '#64748b',
                        fontWeight: '600',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer'
                    }}
                >
                    Produtos
                </button>
                <button
                    onClick={() => setActiveTab('settings')}
                    style={{
                        padding: '1rem',
                        borderBottom: activeTab === 'settings' ? '2px solid #2563eb' : 'none',
                        color: activeTab === 'settings' ? '#2563eb' : '#64748b',
                        fontWeight: '600',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                    }}
                >
                    <Settings size={18} /> Configurações da Loja
                </button>
            </div>

            {activeTab === 'products' ? (
                <section className={styles.section}>
                    <div className={styles.sectionHeader}>
                        <h2>Produtos ({products.length})</h2>
                        <div style={{ display: 'flex', gap: '8px' }}>
                            <Button variant="secondary" icon={Download} onClick={handleExportProducts}>
                                Exportar Excel
                            </Button>
                            <Button icon={Plus} onClick={() => router.push(`/admin/clients/${params.clientSlug}/products/new`)}>
                                Novo Produto
                            </Button>
                        </div>
                    </div>

                    {products.length > 0 ? (
                        <div className={styles.productList}>
                            {products.map(product => (
                                <div key={product.id} className={`${styles.productRow} ${!product.isActive ? styles.productInactive : ''}`}>
                                    <div className={styles.productInfo}>
                                        <div className={styles.productIcon}>
                                            <Package size={20} color="#64748b" />
                                        </div>
                                        <div>
                                            <div className={styles.productName}>{product.name}</div>
                                            <div className={styles.productAlerts}>
                                                <span className={styles.productSlug}>/{product.slug} • {product.price}</span>
                                                <a href={`/${client.slug}/${product.slug}`} target="_blank" title="Ver Produto" style={{ marginLeft: '8px', display: 'inline-flex', alignItems: 'center' }}>
                                                    <ExternalLink size={14} color="#94a3b8" />
                                                </a>
                                            </div>
                                        </div>
                                    </div>
                                    <div className={styles.productActions}>
                                        <button
                                            className={styles.iconButton}
                                            onClick={() => toggleProductStatus(product.id)}
                                            title={product.isActive ? "Desativar" : "Ativar"}
                                        >
                                            <Power size={18} color={product.isActive ? "#16a34a" : "#dc2626"} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className={styles.emptyState}>
                            <p>Nenhum produto cadastrado nesta loja.</p>
                        </div>
                    )}
                </section>
            ) : (
                <div style={{ background: 'white', padding: '2rem', borderRadius: '12px', border: '1px solid #e2e8f0', maxWidth: '800px' }}>
                    <div style={{ marginBottom: '1.5rem' }}>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', color: '#1e293b' }}>Descrição da Loja</label>
                        <textarea
                            rows={4}
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Conte um pouco sobre sua loja..."
                            style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                        />
                    </div>

                    <div style={{ marginBottom: '1.5rem' }}>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', color: '#1e293b' }}>Imagem de Capa (Background)</label>
                        <ImageUploader images={coverImages} onChange={setCoverImages} />
                        <p style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '0.5rem' }}>Recomendado: Uma boa imagem de Banner. A primeira imagem será usada.</p>
                    </div>

                    <Button onClick={handleSaveSettings} disabled={saving} icon={Save}>
                        {saving ? "Salvando..." : "Salvar Alterações"}
                    </Button>
                </div>
            )}

            {/* Modal */}

        </div>
    );
}
