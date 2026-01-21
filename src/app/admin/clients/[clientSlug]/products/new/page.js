"use client";
import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useData } from '@/context/DataContext';
import { useToast } from '@/components/ui/Toast/ToastProvider';
import { ArrowLeft, Save } from 'lucide-react';
import Link from 'next/link';
import Button from '@/components/ui/Button/Button';
import TagInput from '@/components/ui/Form/TagInput';
import RepeaterField from '@/components/ui/Form/RepeaterField';
import ImageUploader from '@/components/ui/ImageUploader/ImageUploader';
import CreatableSelect from '@/components/ui/CreatableSelect/CreatableSelect'; // Feature: Smart Categories
import { Search } from 'lucide-react'; // Feature: Global Search
import styles from './page.module.css';

export default function NewProductPage() {
    const params = useParams();
    const router = useRouter();
    const { getClientBySlug, addProduct, isLoaded, searchGlobalProducts, getCategories } = useData();
    const { addToast } = useToast();
    const [client, setClient] = useState(null);

    // Form State
    const [name, setName] = useState("");
    const [slug, setSlug] = useState("");
    const [price, setPrice] = useState("");
    const [unit, setUnit] = useState("un");
    const [category, setCategory] = useState("");
    const [description, setDescription] = useState("");

    // Dynamic Fields
    const [nutrition, setNutrition] = useState([]);
    const [benefits, setBenefits] = useState([]);
    const [tags, setTags] = useState([]);
    const [tips, setTips] = useState([]);
    const [helpsWith, setHelpsWith] = useState([]);
    const [images, setImages] = useState([]);

    // Global Search State
    const [globalQuery, setGlobalQuery] = useState("");
    const [globalResults, setGlobalResults] = useState([]);
    const [showGlobalResults, setShowGlobalResults] = useState(false);

    // Categories State
    const [categoryOptions, setCategoryOptions] = useState([]);

    const searchParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
    const autoFocus = searchParams?.get('autoFocusSearch');

    useEffect(() => {
        // Load Categories
        getCategories().then(setCategoryOptions);

        // Auto focus search if requested
        if (autoFocus && typeof document !== 'undefined') {
            const input = document.getElementById('global-search-input');
            if (input) input.focus();
        }
    }, [getCategories, autoFocus]);

    const handleGlobalSearch = async (e) => {
        const val = e.target.value;
        setGlobalQuery(val);
        if (val.length > 2) {
            const results = await searchGlobalProducts(val);
            setGlobalResults(results);
            setShowGlobalResults(true);
        } else {
            setGlobalResults([]);
            setShowGlobalResults(false);
        }
    };

    const handleSelectGlobalProduct = (product) => {
        setName(product.name);
        // Auto-generate slug from name if empty, or use existing? 
        // Better generate new slug to avoid conflicts if needed, or let user edit.
        setSlug(product.name.toLowerCase().replace(/ /g, '-').replace(/[^\w-]+/g, ''));
        setPrice(product.price);
        setCategory(product.category);
        setDescription(product.description || "");
        setNutrition(product.nutrition || []);
        setBenefits(product.benefits || []);
        setTags(product.tags || []);
        setHelpsWith(product.helpsWith || []);
        // Handle Image: If url string
        if (product.image && typeof product.image === 'string') {
            setImages([product.image]);
        }

        setShowGlobalResults(false);
        setGlobalQuery("");
        addToast("Dados importados! Revise e salve.", "success");
    };

    useEffect(() => {
        if (isLoaded && params?.clientSlug) {
            const found = getClientBySlug(params.clientSlug);
            setClient(found);
        }
    }, [isLoaded, params, getClientBySlug]);

    const handleNameChange = (e) => {
        const val = e.target.value;
        setName(val);
        setSlug(val.toLowerCase().replace(/ /g, '-').replace(/[^\w-]+/g, ''));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!name || !slug || !price) {
            addToast("Preencha os campos obrigatórios.", "error");
            return;
        }

        const newProduct = {
            clientId: client.id,
            name,
            slug,
            price,
            unit,
            category,
            description,
            nutrition,
            benefits,
            tags,
            tips,
            helpsWith,
            images,
            image: images.length > 0 ? images[0] : "", // Backward compatibility
            isActive: true
        };

        console.log("Submitting Product:", newProduct);
        try {
            await addProduct(client.id, newProduct);
            console.log("Product created successfully");
            addToast("Produto criado com sucesso!", "success");
            router.push(`/admin/clients/${params.clientSlug}`);
        } catch (error) {
            console.error("Error creating product:", error);
            console.error("Error Response:", error.response?.data);
            addToast(`Erro: ${error.response?.data?.error || "Falha ao criar"}`, "error");
        }
    };

    if (!isLoaded) return <div>Carregando...</div>;
    if (!client) return <div>Cliente não encontrado.</div>;

    return (
        <div className={styles.container}>
            <div className={styles.topBar}>
                <Link href={`/admin/clients/${params.clientSlug}`} className={styles.backLink}>
                    <ArrowLeft size={16} /> Voltar
                </Link>
                <h1 className={styles.title}>Novo Produto</h1>
            </div>

            <div style={{ marginBottom: '2rem', position: 'relative' }}>
                <div style={{ display: 'flex', alignItems: 'center', background: 'white', padding: '1rem', borderRadius: '12px', border: '2px dashed #cbd5e1' }}>
                    <Search size={20} color="#64748b" style={{ marginRight: '1rem' }} />
                    <input
                        id="global-search-input"
                        type="text"
                        placeholder="🔍 Pesquisar no Catálogo Global para clonar (Digite 'Mel'...)"
                        value={globalQuery}
                        onChange={handleGlobalSearch}
                        style={{ flex: 1, border: 'none', outline: 'none', fontSize: '1rem' }}
                    />
                </div>
                {showGlobalResults && globalResults.length > 0 && (
                    <div style={{
                        position: 'absolute', top: '100%', left: 0, right: 0,
                        background: 'white', zIndex: 50,
                        borderRadius: '0 0 12px 12px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
                        maxHeight: '300px', overflowY: 'auto'
                    }}>
                        {globalResults.map((p, idx) => (
                            <div
                                key={idx}
                                onClick={() => handleSelectGlobalProduct(p)}
                                style={{ padding: '1rem', borderBottom: '1px solid #f1f5f9', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '1rem' }}
                                onMouseEnter={(e) => e.currentTarget.style.background = '#f8fafc'}
                                onMouseLeave={(e) => e.currentTarget.style.background = 'white'}
                            >
                                <div style={{ width: '40px', height: '40px', borderRadius: '4px', background: '#eee', overflow: 'hidden' }}>
                                    {p.image && <img src={p.image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
                                </div>
                                <div>
                                    <div style={{ fontWeight: 'bold', color: '#334155' }}>{p.name}</div>
                                    <div style={{ fontSize: '0.85rem', color: '#94a3b8' }}>{p.category} • {p.price}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <form onSubmit={handleSubmit} className={styles.formGrid}>
                {/* Left Column: Basic Info */}
                <div className={styles.column}>
                    <div className={styles.card}>
                        <h2 className={styles.cardTitle}>Informações Básicas</h2>

                        <div className={styles.formGroup}>
                            <label>Nome do Produto *</label>
                            <input type="text" value={name} onChange={handleNameChange} placeholder="Ex: Mel Silvestre" required />
                        </div>

                        <div className={styles.formGroup}>
                            <label>Slug (URL) *</label>
                            <input type="text" value={slug} onChange={(e) => setSlug(e.target.value)} required />
                        </div>

                        <div className={styles.row}>
                            <div className={styles.formGroup}>
                                <label>Preço (Interno) *</label>
                                <input type="number" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="0.00" required />
                            </div>
                            <div className={styles.formGroup}>
                                <label>Unidade</label>
                                <input type="text" value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="500g" />
                            </div>
                        </div>

                        <div className={styles.formGroup}>
                            <label>Categoria</label>
                            <CreatableSelect
                                value={category}
                                onChange={(e) => setCategory(e.target.value)}
                                options={categoryOptions}
                                placeholder="Selecione ou crie uma categoria..."
                            />
                        </div>

                        <div className={styles.formGroup}>
                            <label>Descrição</label>
                            <textarea rows={4} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Detalhes do produto..."></textarea>
                        </div>

                        <div className={styles.formGroup}>
                            <label>Imagem (URL Pública)</label>
                            <input
                                type="text"
                                value={images[0] || ""}
                                onChange={(e) => setImages([e.target.value])}
                                placeholder="https://images.unsplash.com/..."
                            />
                            {images[0] && (
                                <div style={{ marginTop: '10px', width: '100%', height: '200px', borderRadius: '8px', overflow: 'hidden', border: '1px solid #e2e8f0' }}>
                                    <img src={images[0]} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                </div>
                            )}
                        </div>
                    </div>

                    <div className={styles.card}>
                        <RepeaterField
                            label="Tabela Nutricional"
                            items={nutrition}
                            onChange={setNutrition}
                            itemLabel="Nutriente"
                        />
                    </div>
                </div>

                {/* Right Column: Dynamic Lists */}
                <div className={styles.column}>
                    <div className={styles.card}>
                        <h2 className={styles.cardTitle}>Conteúdo Dinâmico</h2>

                        <TagInput
                            label="Benefícios (Chips Verdes)"
                            tags={benefits}
                            onChange={setBenefits}
                            placeholder="Ex: Rico em Fibras..."
                        />

                        <TagInput
                            label="Ajuda Com (Chips Laranjas)"
                            tags={helpsWith}
                            onChange={setHelpsWith}
                            placeholder="Ex: Tosse, Imunidade..."
                        />

                        <TagInput
                            label="Tags / Combinações"
                            tags={tags}
                            onChange={setTags}
                            placeholder="Ex: Queijo, Iogurte..."
                        />

                        <TagInput
                            label="Dicas de Consumo (Lista)"
                            tags={tips}
                            onChange={setTips}
                            placeholder="Ex: Consumir pela manhã..."
                        />
                    </div>
                </div>
            </form>

            <div className={styles.footerActions}>
                <Button onClick={handleSubmit} icon={Save} style={{ width: '200px' }}>
                    Salvar Produto
                </Button>
            </div>
        </div>
    );
}
