import pool from '../config/db.js';

export const memberRepository = {
  async findById(id) {
    const [rows] = await pool.query('SELECT * FROM members WHERE id = ? LIMIT 1', [id]);
    return rows[0] || null;
  },

  async findApprovedByPhone(phoneOrEmail) {
    const isEmail = typeof phoneOrEmail === 'string' && phoneOrEmail.includes('@');
    if (isEmail) {
      const emailTrim = phoneOrEmail.trim().toLowerCase();
      const [rows] = await pool.query(
        `SELECT id, email, full_name, phone_number, login_pin, company, designation
         FROM members 
         WHERE (LOWER(TRIM(email)) = ? OR LOWER(TRIM(professional_email)) = ? OR LOWER(TRIM(personal_email)) = ?) AND status = 'approved' 
         LIMIT 1`,
        [emailTrim, emailTrim, emailTrim]
      );
      return rows[0] || null;
    }

    const cleanPhone = String(phoneOrEmail).replace(/\D/g, '');
    const last10 = cleanPhone.slice(-10);
    const [rows] = await pool.query(
      `SELECT id, email, full_name, phone_number, login_pin, company, designation
       FROM members 
       WHERE (phone_number LIKE ? OR personal_phone LIKE ? OR professional_phone LIKE ?) AND status = 'approved' 
       LIMIT 1`,
      [`%${last10}%`, `%${last10}%`, `%${last10}%`]
    );
    return rows[0] || null;
  },

  async updateResetPin(id, pin, expiresAt) {
    const [result] = await pool.query(
      'UPDATE members SET reset_pin = ?, reset_pin_expires_at = ? WHERE id = ?',
      [pin, expiresAt, id]
    );
    return result;
  },

  async findResetPinByMemberId(id) {
    const [rows] = await pool.query(
      'SELECT id, email, full_name, reset_pin, reset_pin_expires_at FROM members WHERE id = ? LIMIT 1',
      [id]
    );
    return rows[0] || null;
  },

  async updateLoginPin(id, newPin) {
    const [result] = await pool.query(
      'UPDATE members SET login_pin = ?, reset_pin = NULL, reset_pin_expires_at = NULL WHERE id = ?',
      [newPin, id]
    );
    return result.affectedRows > 0;
  },

  async verifyMemberLogin(phoneOrEmail, pin) {
    const isEmail = typeof phoneOrEmail === 'string' && phoneOrEmail.includes('@');
    let rows;
    if (isEmail) {
      const emailTrim = phoneOrEmail.trim().toLowerCase();
      const [r] = await pool.query(
        `SELECT id, email, full_name, phone_number, designation, company, itlc_chapter_name, profile_image, membership_tier, status, login_pin
         FROM members 
         WHERE (LOWER(TRIM(email)) = ? OR LOWER(TRIM(professional_email)) = ? OR LOWER(TRIM(personal_email)) = ?) AND status = 'approved'
         LIMIT 1`,
        [emailTrim, emailTrim, emailTrim]
      );
      rows = r;
    } else {
      const cleanPhone = String(phoneOrEmail).replace(/\D/g, '');
      const last10 = cleanPhone.slice(-10);
      const [r] = await pool.query(
        `SELECT id, email, full_name, phone_number, designation, company, itlc_chapter_name, profile_image, membership_tier, status, login_pin
         FROM members 
         WHERE (phone_number LIKE ? OR personal_phone LIKE ? OR professional_phone LIKE ?) AND status = 'approved'
         LIMIT 1`,
        [`%${last10}%`, `%${last10}%`, `%${last10}%`]
      );
      rows = r;
    }
    const member = rows[0] || null;
    if (!member) return { success: false, reason: 'not_found' };
    if (!member.login_pin) return { success: false, reason: 'no_pin_set', member };
    if (member.login_pin !== pin) return { success: false, reason: 'invalid_pin' };
    return { success: true, member };
  },

  async findMembersForInvite({ targetEmail, targetPhone, chapter, groupId }) {
    let queryStr = '';
    const params = [];

    if (groupId) {
      queryStr = `
        SELECT m.id, m.email, m.full_name, m.itlc_chapter_name 
        FROM members m
        INNER JOIN group_members gm ON m.id = gm.member_id
        WHERE gm.group_id = ? AND m.status = 'approved' AND m.email IS NOT NULL
      `;
      params.push(groupId);
    } else {
      queryStr = 'SELECT id, email, full_name, itlc_chapter_name FROM members WHERE status = "approved" AND email IS NOT NULL';

      if (targetEmail) {
        queryStr += ' AND email = ?';
        params.push(targetEmail);
      }

      if (targetPhone) {
        const cleanPhone = String(targetPhone).replace(/\D/g, '');
        queryStr += ' AND (phone_number = ? OR phone_number = ? OR phone_number = ?)';
        params.push(targetPhone, cleanPhone, `+91${cleanPhone}`);
      }

      if (chapter && chapter !== 'all') {
        queryStr += ' AND itlc_chapter_name = ?';
        params.push(chapter);
      }
    }

    const [rows] = await pool.query(queryStr, params);
    return rows;
  }
};
