-- Cidades do MVP Paraná (seção 6 da especificação).
INSERT INTO cidade (nome, uf, latitude, longitude) VALUES
  ('Cascavel',      'PR', -24.955600, -53.455200),
  ('Curitiba',      'PR', -25.428400, -49.273300),
  ('Londrina',      'PR', -23.310300, -51.162800),
  ('Maringá',       'PR', -23.420500, -51.933300),
  ('Toledo',        'PR', -24.724600, -53.742100),
  ('Foz do Iguaçu', 'PR', -25.516300, -54.585400),
  ('Guarapuava',    'PR', -25.390700, -51.462800),
  ('Medianeira',    'PR', -25.295000, -54.093900)
ON DUPLICATE KEY UPDATE nome = VALUES(nome);
