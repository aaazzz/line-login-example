exports.up = function(knex) {
  return knex.schema
    .createTable('users', function (table) {
      table.string('user_id', 255).notNullable()
      table.string('name', 255)
      table.string('status_message', 512)
      table.string('picture', 255)
      table.string('other', 2048)
      table.string('access_token', 1024)
      table.string('refresh_token', 1024)
      table.string('id_token', 1024)
      table.string('otp', 255)
      table.timestamp('created_at')
      table.timestamp('updated_at')

      table.primary(['user_id'])
    })
}

exports.down = function(knex) {
  return knex.schema
    .dropTable("users")
}
