const { sequelize } = require('../config/database');

/**
 * Executa uma operação dentro de uma transação
 * @param {Function} operation - Função que recebe a transação como parâmetro
 * @param {Object} options - Opções da transação (isolationLevel, etc.)
 * @returns {Promise} - Resultado da operação
 */
const executeInTransaction = async (operation, options = {}) => {
    const transaction = await sequelize.transaction(options);
    
    try {
        const result = await operation(transaction);
        await transaction.commit();
        return result;
    } catch (error) {
        await transaction.rollback();
        throw error;
    }
};

/**
 * Executa múltiplas operações em uma única transação
 * @param {Array} operations - Array de funções que recebem a transação
 * @param {Object} options - Opções da transação
 * @returns {Promise} - Array com os resultados de cada operação
 */
const executeBatchInTransaction = async (operations, options = {}) => {
    const transaction = await sequelize.transaction(options);
    
    try {
        const results = [];
        for (const operation of operations) {
            const result = await operation(transaction);
            results.push(result);
        }
        
        await transaction.commit();
        return results;
    } catch (error) {
        await transaction.rollback();
        throw error;
    }
};

/**
 * Níveis de isolamento disponíveis
 */
const ISOLATION_LEVELS = {
    READ_UNCOMMITTED: 'READ UNCOMMITTED',
    READ_COMMITTED: 'READ COMMITTED',
    REPEATABLE_READ: 'REPEATABLE READ',
    SERIALIZABLE: 'SERIALIZABLE'
};

module.exports = {
    executeInTransaction,
    executeBatchInTransaction,
    ISOLATION_LEVELS
};
