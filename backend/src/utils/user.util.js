// Purpose: File code TicketRush; doc comment gan logic ben duoi de nam vai tro va luong xu ly.
const toPublicUser = (user) => {
  if (!user) {
    return null;
  }

  return {
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    avatarUrl: user.avatarUrl,
    role: user.role,
    dob: user.dob ? user.dob.toISOString().slice(0, 10) : null,
    gender: user.gender,
    createdAt: user.createdAt,
  };
};

module.exports = {
  toPublicUser,
};
