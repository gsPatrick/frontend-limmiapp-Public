"use client";
import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useData } from '@/context/DataContext';
import Button from '@/components/ui/Button/Button';
import { Plus, ArrowLeft, Power, Package, Edit2, ExternalLink, Settings, Save, Download, Upload, Copy, Check } from 'lucide-react';
import Link from 'next/link';
import styles from './page.module.css';
import { useToast } from '@/components/ui/Toast/ToastProvider';


export default function AdminClientDetail() {
    const params = useParams();
    const router = useRouter();
    const { getClientBySlug, updateClient, toggleClientStatus, getProductsByClientId, toggleProductStatus, isLoaded, importProducts } = useData();
    const { addToast } = useToast();

    const [client, setClient] = useState(null);
    const [products, setProducts] = useState([]);

    // Settings State
    const [activeTab, setActiveTab] = useState('products'); // 'products' or 'settings'
    const [description, setDescription] = useState("");
    const [coverImages, setCoverImages] = useState([]); // Array for Uploader, but we use first one
    const [saving, setSaving] = useState(false);

    // Import Modal State
    const [importModalOpen, setImportModalOpen] = useState(false);
    const [newProductOptionModalOpen, setNewProductOptionModalOpen] = useState(false); // New Option
    const [importStep, setImportStep] = useState(1); // 1: Prompt, 2: JSON
    const [importJson, setImportJson] = useState("");
    const [importing, setImporting] = useState(false);
    const [copySuccess, setCopySuccess] = useState(false);

    // Global Catalog & Bulk Clone State
    const [globalCatalogOpen, setGlobalCatalogOpen] = useState(false);
    const { searchGlobalProducts } = useData(); // we reused importProducts
    const [globalSearchQuery, setGlobalSearchQuery] = useState("");
    const [globalProducts, setGlobalProducts] = useState([]);
    const [selectedGlobalProducts, setSelectedGlobalProducts] = useState([]);
    const [loadingGlobal, setLoadingGlobal] = useState(false);
    const [cloning, setCloning] = useState(false);

    // Debounce Search Effect
    useEffect(() => {
        if (!globalCatalogOpen) return;

        const timer = setTimeout(async () => {
            setLoadingGlobal(true);
            try {
                const results = await searchGlobalProducts(globalSearchQuery);
                setGlobalProducts(results);
            } catch (error) {
                console.error(error);
            } finally {
                setLoadingGlobal(false);
            }
        }, 500);

        return () => clearTimeout(timer);
    }, [globalCatalogOpen, globalSearchQuery, searchGlobalProducts]);

    const toggleGlobalProductSelection = (product) => {
        setSelectedGlobalProducts(prev => {
            const exists = prev.find(p => p.id === product.id);
            if (exists) return prev.filter(p => p.id !== product.id);
            return [...prev, product];
        });
    };

    const handleBulkClone = async () => {
        if (selectedGlobalProducts.length === 0) return;
        setCloning(true);
        try {
            // Transform selected global products into format expected by importProducts
            // Note: Global products have { id, name, price, ... }. 
            // importProducts expects simplified JSON but basically same fields.
            // We just need to ensure fields match.
            const toImport = selectedGlobalProducts.map(p => ({
                name: p.name,
                description: p.description,
                price: p.price,
                category: p.category,
                image: p.image,
                nutrition: p.nutrition,
                benefits: p.benefits,
                tags: p.tags,
                helpsWith: p.helpsWith
            }));

            await importProducts(client.id, toImport);
            addToast(`${toImport.length} produtos clonados com sucesso!`, "success");
            setGlobalCatalogOpen(false);
            setSelectedGlobalProducts([]);
            // Products update automatically due to logic in DataContext importProducts
        } catch (error) {
            addToast("Erro ao clonar produtos.", "error");
        } finally {
            setCloning(false);
        }
    };

    const PROMPT_TEXT = `Atue como um Especialista em Dados. Tenho uma lista de produtos em texto/excel e preciso que você a converta para um JSON estrito, compatível com meu sistema.
Regras Obrigatórias:
A saída deve ser APENAS um Array de objetos JSON.
Se não tiver informação para um campo, deixe o array vazio [] ou string vazia "".
Para imagens, busque uma URL pública de alta qualidade (ex: Unsplash ou similar) ou deixe vazio se não encontrar.
Estrutura do Objeto (Schema):
[
  {
    "name": "Nome do Produto",
    "category": "Categoria (Ex: Adoçantes)",
    "price": 10.90,
    "description": "Descrição comercial atrativa de 2 linhas.",
    "image": "https://images.unsplash.com/photo-example.jpg",
    "nutrition": [
      { "label": "Calorias", "value": "64 kcal" },
      { "label": "Carboidratos", "value": "17g" }
    ],
    "benefits": ["Benefício 1", "Benefício 2"],
    "tags": ["Combina com Iogurte", "Sem Glúten"],
    "helpsWith": ["Energia", "Imunidade"]
  }
]
Converta os dados abaixo seguindo estritamente essa estrutura:`;

    const handleCopyPrompt = () => {
        navigator.clipboard.writeText(PROMPT_TEXT);
        setCopySuccess(true);
        setTimeout(() => setCopySuccess(false), 2000);
    };

    const handleImport = async () => {
        try {
            const parsed = JSON.parse(importJson);
            if (!Array.isArray(parsed)) {
                addToast("O JSON deve ser uma lista (Array) de produtos.", "error");
                return;
            }
            setImporting(true);
            await importProducts(client.id, parsed);
            addToast(`${parsed.length} produtos importados com sucesso!`, "success");
            setImportModalOpen(false);
            setImportJson("");
            setImportStep(1);
        } catch (error) {
            addToast("Erro ao importar. Verifique o JSON.", "error");
            console.error(error);
        } finally {
            setImporting(false);
        }
    };

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

    // Handle Settings Save
    const handleSaveSettings = async () => {
        setSaving(true);
        try {
            await updateClient(client.id, {
                description,
                coverImage: coverImages[0] || "" // Sending the first image as the cover
            });
            addToast("Configurações salvas com sucesso!", "success");
        } catch (error) {
            console.error(error);
            addToast("Erro ao salvar configurações.", "error");
        } finally {
            setSaving(false);
        }
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
                            <Button variant="secondary" icon={Upload} onClick={() => setImportModalOpen(true)}>
                                Importar JSON
                            </Button>
                            <Button icon={Plus} onClick={() => setNewProductOptionModalOpen(true)}>
                                Novo Produto
                            </Button>
                        </div>
                    </div>

                    {/* New Product Choice Modal */}
                    {newProductOptionModalOpen && (
                        <div className={styles.modalOverlay} onClick={() => setNewProductOptionModalOpen(false)}>
                            <div className={styles.modal} onClick={e => e.stopPropagation()} style={{ maxWidth: '500px', textAlign: 'center' }}>
                                <h2>Adicionar Produto</h2>
                                <p style={{ color: '#64748b', marginBottom: '2rem' }}>Como você deseja adicionar este produto à loja?</p>

                                <div style={{ display: 'grid', gap: '1rem' }}>
                                    <button
                                        onClick={() => router.push(`/admin/clients/${params.clientSlug}/products/new`)}
                                        style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem', border: '1px solid #e2e8f0', borderRadius: '12px', background: 'white', cursor: 'pointer', textAlign: 'left', transition: 'all 0.2s' }}
                                        onMouseEnter={e => e.currentTarget.style.borderColor = '#2563eb'}
                                        onMouseLeave={e => e.currentTarget.style.borderColor = '#e2e8f0'}
                                    >
                                        <div style={{ background: '#eff6ff', padding: '10px', borderRadius: '50%' }}>
                                            <Edit2 size={24} color="#2563eb" />
                                        </div>
                                        <div>
                                            <strong style={{ display: 'block', fontSize: '1rem', marginBottom: '4px' }}>Criar do Zero</strong>
                                            <span style={{ color: '#64748b', fontSize: '0.9rem' }}>Preencher todas as informações manualmente.</span>
                                        </div>
                                    </button>

                                    <button
                                        onClick={() => { setNewProductOptionModalOpen(false); setGlobalCatalogOpen(true); }}
                                        style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem', border: '1px solid #e2e8f0', borderRadius: '12px', background: 'white', cursor: 'pointer', textAlign: 'left', transition: 'all 0.2s' }}
                                        onMouseEnter={e => e.currentTarget.style.borderColor = '#2563eb'}
                                        onMouseLeave={e => e.currentTarget.style.borderColor = '#e2e8f0'}
                                    >
                                        <div style={{ background: '#f5f3ff', padding: '10px', borderRadius: '50%' }}>
                                            <Copy size={24} color="#7c3aed" />
                                        </div>
                                        <div>
                                            <strong style={{ display: 'block', fontSize: '1rem', marginBottom: '4px' }}>Selecionar da Base Global</strong>
                                            <span style={{ color: '#64748b', fontSize: '0.9rem' }}>Buscar e clonar de uma lista existente.</span>
                                        </div>
                                    </button>
                                </div>

                                <div style={{ marginTop: '2rem' }}>
                                    <Button variant="ghost" onClick={() => setNewProductOptionModalOpen(false)}>Cancelar</Button>
                                </div>
                            </div>
                        </div>
                    )}

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
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', color: '#1e293b' }}>URL da Imagem de Capa (Banner)</label>
                        <input
                            type="text"
                            value={coverImages[0] || ""}
                            onChange={(e) => setCoverImages([e.target.value])}
                            placeholder="https://..."
                            style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', marginBottom: '0.5rem' }}
                        />
                        {coverImages[0] && (
                            <div style={{ width: '100%', height: '200px', borderRadius: '8px', overflow: 'hidden', border: '1px solid #e2e8f0', background: '#f8fafc' }}>
                                <img src={coverImages[0]} alt="Preview da Capa" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={(e) => e.target.style.display = 'none'} />
                            </div>
                        )}
                        <p style={{ fontSize: '0.85rem', color: '#64748b' }}>Cole o link direto da imagem que deseja usar como capa da loja.</p>
                    </div>

                    <Button onClick={handleSaveSettings} disabled={saving} icon={Save}>
                        {saving ? "Salvando..." : "Salvar Alterações"}
                    </Button>
                </div>
            )}

            {/* Global Catalog Bulk Clone Modal */}
            {globalCatalogOpen && (
                <div className={styles.modalOverlay} onClick={() => setGlobalCatalogOpen(false)}>
                    <div className={styles.modal} onClick={e => e.stopPropagation()} style={{ maxWidth: '800px', height: '80vh', display: 'flex', flexDirection: 'column' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                            <h2>Catálogo Global</h2>
                            <Button variant="ghost" onClick={() => setGlobalCatalogOpen(false)}>Fechar</Button>
                        </div>

                        <div style={{ marginBottom: '1rem', display: 'flex', gap: '10px' }}>
                            <input
                                type="text"
                                placeholder="Buscar produto global..."
                                value={globalSearchQuery}
                                onChange={(e) => setGlobalSearchQuery(e.target.value)}
                                style={{ flex: 1, padding: '0.5rem', borderRadius: '8px', border: '1px solid #ddd' }}
                            />
                            {selectedGlobalProducts.length > 0 && (
                                <div style={{ alignSelf: 'center', fontWeight: 'bold', color: '#2563eb' }}>
                                    {selectedGlobalProducts.length} selecionados
                                </div>
                            )}
                        </div>

                        <div style={{ flex: 1, overflowY: 'auto', border: '1px solid #f1f5f9', borderRadius: '8px', padding: '0.5rem' }}>
                            {loadingGlobal ? (
                                <div style={{ padding: '2rem', textAlign: 'center' }}>Carregando...</div>
                            ) : (
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem' }}>
                                    {globalProducts.map(p => {
                                        const isSelected = selectedGlobalProducts.some(sel => sel.id === p.id);

                                        return (
                                            <div
                                                key={p.id}
                                                onClick={() => toggleGlobalProductSelection(p)}
                                                style={{
                                                    border: isSelected ? '2px solid #2563eb' : '1px solid #e2e8f0',
                                                    borderRadius: '8px',
                                                    padding: '10px',
                                                    cursor: 'pointer',
                                                    background: isSelected ? '#eff6ff' : 'white',
                                                    transition: 'all 0.2s',
                                                    position: 'relative'
                                                }}
                                            >
                                                {isSelected && <div style={{ position: 'absolute', top: '5px', right: '5px', background: '#2563eb', color: 'white', borderRadius: '50%', padding: '2px' }}><Check size={12} /></div>}

                                                <div style={{ height: '100px', background: '#f8fafc', marginBottom: '10px', borderRadius: '4px', overflow: 'hidden' }}>
                                                    {p.image ? (
                                                        <img src={p.image} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                    ) : (
                                                        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#cbd5e1' }}><Package size={32} /></div>
                                                    )}
                                                </div>
                                                <div style={{ fontWeight: 'bold', fontSize: '0.9rem', marginBottom: '4px', height: '40px', overflow: 'hidden' }}>{p.name}</div>
                                                <div style={{ fontSize: '0.8rem', color: '#64748b' }}>{p.category}</div>
                                            </div>
                                        );
                                    })}
                                    {globalProducts.length === 0 && <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>Nenhum produto encontrado.</div>}
                                </div>
                            )}
                        </div>

                        <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                            <Button variant="secondary" onClick={() => setGlobalCatalogOpen(false)}>Cancelar</Button>
                            <Button onClick={handleBulkClone} disabled={selectedGlobalProducts.length === 0 || cloning}>
                                {cloning ? "Clonando..." : `Importar ${selectedGlobalProducts.length} Produtos`}
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal */}
            {importModalOpen && (
                <div className={styles.modalOverlay} onClick={() => setImportModalOpen(false)}>
                    <div className={styles.modal} onClick={e => e.stopPropagation()} style={{ maxWidth: '600px' }}>
                        <h2>Importação em Massa</h2>

                        <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem', borderBottom: '1px solid #e2e8f0' }}>
                            <button
                                onClick={() => setImportStep(1)}
                                style={{ padding: '0.5rem', borderBottom: importStep === 1 ? '2px solid #2563eb' : 'none', fontWeight: importStep === 1 ? 'bold' : 'normal' }}
                            >
                                1. Instruções (Prompt)
                            </button>
                            <button
                                onClick={() => setImportStep(2)}
                                style={{ padding: '0.5rem', borderBottom: importStep === 2 ? '2px solid #2563eb' : 'none', fontWeight: importStep === 2 ? 'bold' : 'normal' }}
                            >
                                2. Colar JSON
                            </button>
                        </div>

                        {importStep === 1 ? (
                            <div>
                                <p style={{ marginBottom: '1rem', color: '#64748b' }}>
                                    Copie o prompt abaixo e envie para uma IA (ChatGPT, Claude, Manus) junto com sua lista de produtos.
                                </p>
                                <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '1rem', fontSize: '0.85rem', maxHeight: '200px', overflowY: 'auto', whiteSpace: 'pre-wrap' }}>
                                    {PROMPT_TEXT}
                                </div>
                                <Button onClick={handleCopyPrompt} icon={copySuccess ? Check : Copy} variant="secondary" fullWidth>
                                    {copySuccess ? "Copiado!" : "Copiar Prompt"}
                                </Button>
                                <div style={{ marginTop: '1rem', textAlign: 'right' }}>
                                    <Button onClick={() => setImportStep(2)}>Próximo Passo &rarr;</Button>
                                </div>
                            </div>
                        ) : (
                            <div>
                                <p style={{ marginBottom: '1rem', color: '#64748b' }}>
                                    Cole o JSON gerado pela IA aqui.
                                </p>
                                <textarea
                                    rows={10}
                                    value={importJson}
                                    onChange={(e) => setImportJson(e.target.value)}
                                    placeholder='Cole aqui: [{"name": "Produto 1"...}]'
                                    style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontFamily: 'monospace', fontSize: '0.85rem' }}
                                />
                                <div className={styles.modalActions}>
                                    <Button variant="secondary" onClick={() => setImportModalOpen(false)}>Cancelar</Button>
                                    <Button onClick={handleImport} disabled={importing || !importJson}>
                                        {importing ? "Importando..." : "Validar e Importar"}
                                    </Button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

        </div>
    );
}
