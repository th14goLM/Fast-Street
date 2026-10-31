-- Fast Street · Onboarding passos 2–4: dados opcionais (UC-16), uploads e primeiro veículo (UC-01).
-- Modelo da especificação, seção 11.1 (CATEGORIA, MARCA, VEICULO, FOTO_VEICULO) + UPLOAD temporário.

CREATE TABLE IF NOT EXISTS categoria (
  id    TINYINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  nome  VARCHAR(40) NOT NULL,
  ordem TINYINT UNSIGNED NOT NULL DEFAULT 0,
  UNIQUE KEY uk_categoria_nome (nome)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

INSERT INTO categoria (nome, ordem) VALUES
  ('Street Legal', 1), ('Turismo', 2), ('Aspirado', 3), ('Turbo', 4), ('Clássicos', 5)
ON DUPLICATE KEY UPDATE ordem = VALUES(ordem);

-- Lista fechada do MVP (spec, seção 6). Novas marcas entram por INSERT, sem mudar o app.
CREATE TABLE IF NOT EXISTS marca (
  id    SMALLINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  nome  VARCHAR(60) NOT NULL,
  ativa TINYINT(1)  NOT NULL DEFAULT 1,
  UNIQUE KEY uk_marca_nome (nome)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

INSERT INTO marca (nome) VALUES ('Chevrolet'), ('Ford'), ('Honda'), ('Toyota'), ('Volkswagen')
ON DUPLICATE KEY UPDATE nome = VALUES(nome);

-- Arquivos enviados antes de o formulário ser salvo (upload individual com progresso e
-- "Tentar novamente" sem perder o formulário, RN-VEI-02). Viram foto de perfil ou de
-- veículo quando o cadastro é concluído (usado_em). Os não usados podem ser limpos depois de 24 h.
CREATE TABLE IF NOT EXISTS upload (
  id             CHAR(36)     NOT NULL PRIMARY KEY,
  usuario_id     CHAR(36)     NOT NULL,
  finalidade     ENUM('foto_perfil','foto_veiculo') NOT NULL,
  caminho        VARCHAR(255) NOT NULL COMMENT 'Relativo a UPLOAD_DIR, ex.: 2026/10/<uuid>.jpg',
  mime           ENUM('image/png','image/jpeg') NOT NULL,
  tamanho_bytes  INT UNSIGNED NOT NULL,
  usado_em       DATETIME(3)  NULL,
  created_at     DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  KEY ix_upload_usuario (usuario_id, created_at),
  CONSTRAINT fk_upload_usuario FOREIGN KEY (usuario_id) REFERENCES usuario (id) ON DELETE CASCADE,
  CONSTRAINT ck_upload_tamanho CHECK (tamanho_bytes <= 1048576)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS veiculo (
  id            CHAR(36)          NOT NULL PRIMARY KEY,
  usuario_id    CHAR(36)          NOT NULL,
  marca_id      SMALLINT UNSIGNED NOT NULL,
  modelo        VARCHAR(60)       NOT NULL,
  ano           SMALLINT UNSIGNED NOT NULL,
  cor           VARCHAR(40)       NULL,
  categoria_id  TINYINT UNSIGNED  NOT NULL,
  principal     TINYINT(1)        NOT NULL DEFAULT 0,
  motor         VARCHAR(60)       NULL,
  potencia_cv   SMALLINT UNSIGNED NULL,
  torque_kgfm   DECIMAL(5,1)      NULL,
  peso_kg       SMALLINT UNSIGNED NULL,
  transmissao   VARCHAR(40)       NULL,
  modificacoes  TEXT              NULL COMMENT 'Uma por linha',
  excluido_em   DATETIME(3)       NULL COMMENT 'Soft delete: o histórico de eventos sobrevive (RN-VEI-06)',
  created_at    DATETIME(3)       NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at    DATETIME(3)       NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  -- MySQL não tem índice único parcial: a coluna gerada só tem valor para o principal ativo,
  -- e o UNIQUE garante no máximo 1 veículo principal por usuário (RN-VEI-04).
  principal_de  CHAR(36) GENERATED ALWAYS AS (IF(principal = 1 AND excluido_em IS NULL, usuario_id, NULL)) STORED,
  UNIQUE KEY uk_veiculo_principal (principal_de),
  KEY ix_veiculo_usuario (usuario_id, excluido_em),
  -- Sem CASCADE: o MySQL não permite ação referencial na coluna-base de uma coluna gerada.
  -- A exclusão de conta é por anonimização (RN-LGPD-02), não por DELETE físico.
  CONSTRAINT fk_veiculo_usuario   FOREIGN KEY (usuario_id)   REFERENCES usuario (id),
  CONSTRAINT fk_veiculo_marca     FOREIGN KEY (marca_id)     REFERENCES marca (id),
  CONSTRAINT fk_veiculo_categoria FOREIGN KEY (categoria_id) REFERENCES categoria (id),
  CONSTRAINT ck_veiculo_ano CHECK (ano BETWEEN 1900 AND 2100)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS foto_veiculo (
  id          CHAR(36)         NOT NULL PRIMARY KEY,
  veiculo_id  CHAR(36)         NOT NULL,
  upload_id   CHAR(36)         NOT NULL,
  ordem       TINYINT UNSIGNED NOT NULL COMMENT '1 a 6; a 1 é a capa',
  created_at  DATETIME(3)      NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE KEY uk_foto_upload (upload_id),
  UNIQUE KEY uk_foto_ordem (veiculo_id, ordem),
  CONSTRAINT fk_foto_veiculo FOREIGN KEY (veiculo_id) REFERENCES veiculo (id) ON DELETE CASCADE,
  CONSTRAINT fk_foto_upload  FOREIGN KEY (upload_id)  REFERENCES upload (id),
  CONSTRAINT ck_foto_ordem CHECK (ordem BETWEEN 1 AND 6)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Foto de perfil passa a apontar para um upload (a coluna foto_url da 001 fica sem uso).
SET @col_exists := (SELECT COUNT(*) FROM information_schema.columns
                     WHERE table_schema = DATABASE() AND table_name = 'usuario' AND column_name = 'foto_upload_id');
SET @ddl := IF(@col_exists = 0,
  'ALTER TABLE usuario ADD COLUMN foto_upload_id CHAR(36) NULL AFTER foto_url, ADD CONSTRAINT fk_usuario_foto FOREIGN KEY (foto_upload_id) REFERENCES upload (id) ON DELETE SET NULL',
  'SELECT 1');
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
