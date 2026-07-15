const getPagination = (page = 1, limit = 20) => {
  const offset = (page - 1) * limit;
  return { limit: Math.min(limit, 50), offset, page: Math.max(1, page) };
};

const paginateResponse = (data, total, page, limit) => {
  const totalPages = Math.ceil(total / limit);
  return {
    data,
    pagination: {
      total,
      page,
      limit,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    },
  };
};

module.exports = { getPagination, paginateResponse };
