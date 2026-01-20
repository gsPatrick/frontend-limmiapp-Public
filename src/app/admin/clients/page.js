"use client";
import React, { useState } from 'react';
import Link from 'next/link';
import { useData } from '@/context/DataContext';
import Button from '@/components/ui/Button/Button';
import { Plus, Store, MoreVertical, ExternalLink } from 'lucide-react';
import styles from './page.module.css';
import { useToast } from '@/components/ui/Toast/ToastProvider';

export default function AdminClients() {
    const { clients, addClient, toggleClientStatus, bulkImportClients } = useData();
    const { addToast } = useToast();
    const [isModalOpen, setIsModalOpen] = useState(false);

    // Single Create State
    const [newClientName, setNewClientName] = useState("");
    const [newClientSlug, setNewClientSlug] = useState("");

    // Bulk Import State
    const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
    const [importStep, setImportStep] = useState(1);
    const [importJson, setImportJson] = useState("");
    const [importing, setImporting] = useState(false);
    const [copySuccess, setCopySuccess] = useState(false);

    const PROMPT_TEXT = `Atue como um Arquiteto de Dados. Preciso criar uma estrutura completa de lojas e produtos para um sistema de gestão.
Regras:
1. Gere um ARRAY JSON contendo objetos de CLIENTES.
2. Cada Cliente deve ter um array de PRODUTOS.
3. Se inventar dados, faça-os parecer reais e variados.

Estrutura Obrigatória (Schema JSON):
[
  {
    "name": "Nome da Loja",
    "slug": "nome-da-loja-slug",
    "description": "Uma breve descrição da loja...",
    "products": [
      {
        "name": "Nome do Produto",
        "category": "Granel",
        "price": 29.90,
        "image": "https://images.unsplash.com/photo-example",
        "nutrition": [
             { "label": "Proteína", "value": "10g" }
        ]
      }
    ]
  }
]
Gere 3 lojas, cada uma com 5 produtos variados:`;

    const handleCopyPrompt = () => {
        navigator.clipboard.writeText(PROMPT_TEXT);
        setCopySuccess(true);
        setTimeout(() => setCopySuccess(false), 2000);
    };

    const handleBulkImport = async () => {
        try {
            const parsed = JSON.parse(importJson);
            if (!Array.isArray(parsed)) {
                addToast("O JSON deve ser uma lista (Array) de clientes.", "error");
                return;
            }
            setImporting(true);
            await bulkImportClients(parsed);
            addToast(`Importação concluída!`, "success");
            setIsBulkModalOpen(false);
            setImportJson("");
            setImportStep(1);
        } catch (error) {
            addToast("Erro na importação. Verifique o console.", "error");
            console.error(error);
        } finally {
            setImporting(false);
        }
    };

    const handleCreateClient = async (e) => {
        e.preventDefault();
        if (!newClientName || !newClientSlug) return;

        try {
            await addClient({
                name: newClientName,
                slug: newClientSlug,
                description: "Nova loja criada",
            });

            setIsModalOpen(false);
            setNewClientName("");
            setNewClientSlug("");
            addToast("Cliente criado com sucesso!", "success");
        } catch (error) {
            addToast("Erro ao criar cliente.", "error");
        }
    };

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <div>
                    <h1 className={styles.title}>Gestão de Clientes</h1>
                    <p style={{ color: '#64748b' }}>Gerencie as lojas cadastradas na plataforma.</p>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                    <Button variant="secondary" onClick={() => setIsBulkModalOpen(true)}>
                        Importar Clientes (JSON)
                    </Button>
                    <Button icon={Plus} onClick={() => setIsModalOpen(true)}>
                        Novo Cliente
                    </Button>
                </div>
            </header>

            <div className={styles.grid}>
                {clients.map(client => (
                    <div key={client.id} className={styles.card}>
                        <div className={styles.cardHeader}>
                            <div className={styles.iconWrapper}>
                                <Store size={24} color="#1e40af" />
                            </div>
                            <div className={styles.menu}>
                                <span className={`${styles.statusBadge} ${client.isActive ? styles.active : styles.inactive}`}>
                                    {client.isActive ? "Ativo" : "Inativo"}
                                </span>
                            </div>
                        </div>
                        <h3 className={styles.clientName}>{client.name}</h3>
                        <p className={styles.clientSlug}>/{client.slug}</p>
                        <p className={styles.stats}>
                            {(client.products || []).length} Produtos • {(client.orders || []).length} Pedidos
                        </p>
                        <div style={{ marginTop: '0.5rem' }}>
                            <a href={`/${client.slug}`} target="_blank" className={styles.externalLink} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.85rem', color: '#64748b', textDecoration: 'none' }}>
                                <ExternalLink size={14} /> Ver Loja
                            </a>
                        </div>

                        <div className={styles.cardActions}>
                            <Link href={`/admin/clients/${client.slug}`} style={{ width: '100%' }}>
                                <Button variant="ghost" style={{ width: '100%', border: '1px solid #e2e8f0' }}>
                                    Gerenciar Loja
                                </Button>
                            </Link>
                        </div>
                    </div>
                ))}
            </div>

            {/* Simple Modal for Create */}
            {isModalOpen && (
                <div className={styles.modalOverlay} onClick={() => setIsModalOpen(false)}>
                    <div className={styles.modal} onClick={e => e.stopPropagation()}>
                        <h2>Criar Novo Cliente</h2>
                        <form onSubmit={handleCreateClient}>
                            <div className={styles.formGroup}>
                                <label>Nome da Loja</label>
                                <input
                                    type="text"
                                    value={newClientName}
                                    onChange={(e) => {
                                        setNewClientName(e.target.value);
                                        setNewClientSlug(e.target.value.toLowerCase().replace(/ /g, '-').replace(/[^\w-]+/g, ''));
                                    }}
                                    placeholder="Ex: Empório da Maria"
                                    required
                                />
                            </div>
                            <div className={styles.formGroup}>
                                <label>Slug (URL)</label>
                                <input
                                    type="text"
                                    value={newClientSlug}
                                    onChange={(e) => setNewClientSlug(e.target.value)}
                                    placeholder="ex: emporio-da-maria"
                                    required
                                />
                            </div>
                            <div className={styles.modalActions}>
                                <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
                                <Button type="submit">Criar Loja</Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Bulk Import Modal */}
            {isBulkModalOpen && (
                <div className={styles.modalOverlay} onClick={() => setIsBulkModalOpen(false)}>
                    <div className={styles.modal} onClick={e => e.stopPropagation()} style={{ maxWidth: '600px' }}>
                        {/* Header with Steps */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                            <h2 style={{ margin: 0 }}>Importação em Massa</h2>
                            <button onClick={() => setIsBulkModalOpen(false)} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer' }}>&times;</button>
                        </div>

                        <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem', borderBottom: '1px solid #e2e8f0' }}>
                            <button
                                onClick={() => setImportStep(1)}
                                style={{ padding: '0.5rem', borderBottom: importStep === 1 ? '2px solid #2563eb' : 'none', fontWeight: importStep === 1 ? 'bold' : 'normal', flex: 1 }}
                            >
                                1. Instruções (Prompt)
                            </button>
                            <button
                                onClick={() => setImportStep(2)}
                                style={{ padding: '0.5rem', borderBottom: importStep === 2 ? '2px solid #2563eb' : 'none', fontWeight: importStep === 2 ? 'bold' : 'normal', flex: 1 }}
                            >
                                2. Colar JSON
                            </button>
                        </div>

                        {importStep === 1 ? (
                            <div>
                                <p style={{ marginBottom: '1rem', color: '#64748b', fontSize: '0.9rem' }}>
                                    Use este prompt para gerar o JSON com seus Clientes e seus respectivos Produtos.
                                </p>
                                <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '1rem', fontSize: '0.8rem', maxHeight: '250px', overflowY: 'auto', whiteSpace: 'pre-wrap', fontFamily: 'monospace' }}>
                                    {PROMPT_TEXT}
                                </div>
                                <Button onClick={handleCopyPrompt} variant="secondary" fullWidth style={{ marginBottom: '1rem' }}>
                                    {copySuccess ? "Copiado!" : "Copiar Prompt"}
                                </Button>
                                <div style={{ textAlign: 'right' }}>
                                    <Button onClick={() => setImportStep(2)}>Ir para Importação &rarr;</Button>
                                </div>
                            </div>
                        ) : (
                            <div>
                                <p style={{ marginBottom: '1rem', color: '#64748b' }}>
                                    Cole o JSON gerado abaixo.
                                </p>
                                <textarea
                                    rows={10}
                                    value={importJson}
                                    onChange={(e) => setImportJson(e.target.value)}
                                    placeholder='[{ "name": "Loja 1", "products": [...] }]'
                                    style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontFamily: 'monospace', fontSize: '0.85rem' }}
                                />
                                <div className={styles.modalActions} style={{ marginTop: '1rem' }}>
                                    <Button variant="secondary" onClick={() => setIsBulkModalOpen(false)}>Cancelar</Button>
                                    <Button onClick={handleBulkImport} disabled={importing || !importJson}>
                                        {importing ? "Processando..." : "Importar Clientes"}
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
