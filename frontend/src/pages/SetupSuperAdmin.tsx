import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';

const SetupSuperAdmin = () => {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        nom_tenant: '',
        sous_domaine: '',
        pays: 'CM',
        email: '',
        mot_de_passe: '',
        confirm_password: ''
    });
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        if (formData.mot_de_passe !== formData.confirm_password) {
            setError('Les mots de passe ne correspondent pas.');
            return;
        }

        setLoading(true);

        try {
            await api.post('/api/auth/setup', {
                nom_tenant: formData.nom_tenant,
                sous_domaine: formData.sous_domaine,
                pays: formData.pays,
                email: formData.email,
                mot_de_passe: formData.mot_de_passe
            });

            setSuccess('Compte Super Admin créé avec succès ! Redirection vers la connexion...');
            setTimeout(() => {
                navigate('/login');
            }, 3000);
        } catch (err: any) {
            setError(err.response?.data?.error || err.message || 'Une erreur inattendue s\'est produite.');
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
            <div className="sm:mx-auto sm:w-full sm:max-w-md">
                <div className="flex justify-center">
                    <div className="h-16 w-16 bg-blue-600 rounded-xl flex items-center justify-center transform rotate-12 shadow-lg">
                        <div className="h-10 w-10 bg-white rounded-lg transform -rotate-12 flex items-center justify-center">
                            <span className="text-blue-600 font-bold text-xl">S</span>
                        </div>
                    </div>
                </div>
                <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
                    Configuration Initiale
                </h2>
                <p className="mt-2 text-center text-sm text-gray-600">
                    Création du premier compte Super Admin
                </p>
            </div>

            <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-xl">
                <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
                    {error && (
                        <div className="mb-4 bg-red-50 border-l-4 border-red-500 p-4">
                            <div className="flex">
                                <div className="ml-3">
                                    <p className="text-sm text-red-700">{error}</p>
                                </div>
                            </div>
                        </div>
                    )}

                    {success && (
                        <div className="mb-4 bg-green-50 border-l-4 border-green-500 p-4">
                            <div className="flex">
                                <div className="ml-3">
                                    <p className="text-sm text-green-700">{success}</p>
                                </div>
                            </div>
                        </div>
                    )}

                    <form className="space-y-6" onSubmit={handleSubmit}>
                        <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-2">
                            <div className="sm:col-span-2">
                                <h3 className="text-lg font-medium leading-6 text-gray-900 border-b pb-2">Informations de l'Organisation</h3>
                            </div>

                            <div className="sm:col-span-2">
                                <label className="block text-sm font-medium text-gray-700">Nom du Tenant (Organisation / Marque)</label>
                                <div className="mt-1">
                                    <input
                                        name="nom_tenant"
                                        type="text"
                                        required
                                        value={formData.nom_tenant}
                                        onChange={handleChange}
                                        className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                        placeholder="Ex: My School HQ"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700">Sous-domaine</label>
                                <div className="mt-1 flex rounded-md justify-center items-center shadow-sm">
                                    <input
                                        name="sous_domaine"
                                        type="text"
                                        required
                                        value={formData.sous_domaine}
                                        onChange={handleChange}
                                        className="flex-1 min-w-0 block w-full px-3 py-2 rounded-none rounded-l-md sm:text-sm border-gray-300 border focus:ring-blue-500 focus:border-blue-500"
                                        placeholder="hq"
                                    />
                                    <span className="inline-flex items-center px-3 py-2 rounded-r-md border border-l-0 border-gray-300 bg-gray-50 text-gray-500 sm:text-sm">
                                        .scholaris.com
                                    </span>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700">Pays</label>
                                <div className="mt-1">
                                    <select
                                        name="pays"
                                        value={formData.pays}
                                        onChange={handleChange}
                                        className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                                    >
                                        <option value="CM">Cameroun</option>
                                        <option value="SN">Sénégal</option>
                                        <option value="CI">Côte d'Ivoire</option>
                                        <option value="FR">France</option>
                                    </select>
                                </div>
                            </div>

                            <div className="sm:col-span-2 mt-4">
                                <h3 className="text-lg font-medium leading-6 text-gray-900 border-b pb-2">Informations du Super Admin</h3>
                            </div>

                            <div className="sm:col-span-2">
                                <label className="block text-sm font-medium text-gray-700">Adresse e-mail</label>
                                <div className="mt-1">
                                    <input
                                        name="email"
                                        type="email"
                                        autoComplete="email"
                                        required
                                        value={formData.email}
                                        onChange={handleChange}
                                        className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700">Mot de passe</label>
                                <div className="mt-1">
                                    <input
                                        name="mot_de_passe"
                                        type="password"
                                        required
                                        value={formData.mot_de_passe}
                                        onChange={handleChange}
                                        className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700">Confirmer le mot de passe</label>
                                <div className="mt-1">
                                    <input
                                        name="confirm_password"
                                        type="password"
                                        required
                                        value={formData.confirm_password}
                                        onChange={handleChange}
                                        className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="pt-4">
                            <button
                                type="submit"
                                disabled={loading}
                                className={`w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${loading ? 'opacity-75 cursor-not-allowed' : ''}`}
                            >
                                {loading ? 'Création en cours...' : 'Créer le compte Super Admin'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default SetupSuperAdmin;
