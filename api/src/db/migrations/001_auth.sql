-- Fast Street · Módulo de autenticação (UC-00 Cadastro, UC-10 Login)
-- Modelo derivado de docs/FAST_STREET_ESPECIFICACAO.md, seção 11.
-- Charset utf8mb4 + collation utf8mb4_0900_ai_ci: comparações de e-mail
-- insensíveis a maiúsculas/acentos (equivalente ao citext do PostgreSQL).

CREATE TABLE IF NOT EXISTS cidade (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  nome        VARCHAR(80)  NOT NULL,
  uf          CHAR(2)      NOT NULL,
  latitude    DECIMAL(9,6) NULL,
  longitude   DECIMAL(9,6) NULL,
  ativa       TINYINT(1)   NOT NULL DEFAULT 1,
  UNIQUE KEY uk_cidade_nome_uf (nome, uf)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS usuario (
  id                   CHAR(36)     NOT NULL PRIMARY KEY,
  email                VARCHAR(254) NOT NULL,
  senha_hash           VARCHAR(100) NULL COMMENT 'NULL quando a conta só usa login social',
  nome_completo        VARCHAR(120) NOT NULL,
  cidade_id            INT UNSIGNED NOT NULL,
  perfil               ENUM('piloto','org','ambos') NOT NULL,
  bio                  VARCHAR(160) NULL,
  instagram            VARCHAR(31)  NULL,
  youtube_url          VARCHAR(255) NULL,
  foto_url             VARCHAR(500) NULL,
  email_verificado_em  DATETIME(3)  NULL,
  termos_versao        VARCHAR(20)  NOT NULL,
  termos_aceitos_em    DATETIME(3)  NOT NULL,
  status               ENUM('ativo','exclusao_agendada','anonimizado') NOT NULL DEFAULT 'ativo',
  created_at           DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at           DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  UNIQUE KEY uk_usuario_email (email),
  CONSTRAINT fk_usuario_cidade FOREIGN KEY (cidade_id) REFERENCES cidade (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS organizador (
  id                CHAR(36)     NOT NULL PRIMARY KEY,
  usuario_id        CHAR(36)     NOT NULL,
  nome_organizacao  VARCHAR(120) NOT NULL,
  tipo_documento    ENUM('cpf','cnpj') NOT NULL,
  documento         VARCHAR(14)  NOT NULL COMMENT 'Somente dígitos',
  telefone          VARCHAR(11)  NOT NULL COMMENT 'Somente dígitos, com DDD',
  verificado        TINYINT(1)   NOT NULL DEFAULT 0,
  verificado_em     DATETIME(3)  NULL,
  created_at        DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at        DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  UNIQUE KEY uk_organizador_usuario (usuario_id),
  CONSTRAINT fk_organizador_usuario FOREIGN KEY (usuario_id) REFERENCES usuario (id) ON DELETE CASCADE,
  CONSTRAINT ck_organizador_documento CHECK (
    (tipo_documento = 'cpf'  AND CHAR_LENGTH(documento) = 11) OR
    (tipo_documento = 'cnpj' AND CHAR_LENGTH(documento) = 14)
  )
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Tokens de uso único (verificação de e-mail e, na próxima etapa, redefinição de senha).
-- Guardamos apenas o SHA-256 do token; o valor puro só existe no link enviado.
CREATE TABLE IF NOT EXISTS token_autenticacao (
  id          CHAR(36)    NOT NULL PRIMARY KEY,
  usuario_id  CHAR(36)    NOT NULL,
  tipo        ENUM('verificacao_email','redefinicao_senha') NOT NULL,
  token_hash  CHAR(64)    NOT NULL,
  expira_em   DATETIME(3) NOT NULL,
  usado_em    DATETIME(3) NULL,
  created_at  DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE KEY uk_token_hash (token_hash),
  KEY ix_token_usuario_tipo (usuario_id, tipo, created_at),
  CONSTRAINT fk_token_usuario FOREIGN KEY (usuario_id) REFERENCES usuario (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Sessões com refresh token rotativo (hash SHA-256). Permite "encerrar sessões em
-- outros aparelhos" (RN-AUT-04) revogando as linhas.
CREATE TABLE IF NOT EXISTS sessao (
  id                  CHAR(36)     NOT NULL PRIMARY KEY,
  usuario_id          CHAR(36)     NOT NULL,
  refresh_token_hash  CHAR(64)     NOT NULL,
  dispositivo         VARCHAR(200) NULL,
  expira_em           DATETIME(3)  NOT NULL,
  revogada_em         DATETIME(3)  NULL,
  created_at          DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  ultimo_uso_em       DATETIME(3)  NULL,
  UNIQUE KEY uk_sessao_refresh (refresh_token_hash),
  KEY ix_sessao_usuario (usuario_id),
  CONSTRAINT fk_sessao_usuario FOREIGN KEY (usuario_id) REFERENCES usuario (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
