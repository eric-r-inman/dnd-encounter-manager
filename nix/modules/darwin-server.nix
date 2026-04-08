# Darwin (macOS/launchd) module for the dnd-encounter-manager-server service.
# Exported from the flake as darwinModules.server.
# See nixos-server.nix for the Linux/systemd equivalent.
#
# Minimal usage (defaults to Unix domain socket):
#
#   inputs.dnd-encounter-manager.darwinModules.server
#
#   services.dnd-encounter-manager-server = {
#     enable = true;
#   };
#
# To use TCP instead:
#
#   services.dnd-encounter-manager-server = {
#     enable = true;
#     socket = null;
#     port   = 8080;
#   };
#
# To enable health checking (requires a reachable health endpoint):
#
#   services.dnd-encounter-manager-server = {
#     enable = true;
#     healthCheck.enable = true;
#     healthCheck.url = "http://127.0.0.1:3000/health";
#   };
{self}: {
  config,
  lib,
  pkgs,
  ...
}: let
  cfg = config.services.dnd-encounter-manager-server;

  listenArg =
    if cfg.socket != null
    then "--listen unix:${cfg.socket}"
    else "--listen ${cfg.host}:${toString cfg.port}";

  execLine =
    "${cfg.package}/bin/dnd-encounter-manager-server"
    + " ${listenArg}"
    + " --frontend-path ${cfg.frontendPath}";
in {
  options.services.dnd-encounter-manager-server = {
    enable = lib.mkEnableOption "dnd-encounter-manager-server service";

    package = lib.mkOption {
      type = lib.types.package;
      default = self.packages.${pkgs.stdenv.hostPlatform.system}.server;
      defaultText = lib.literalExpression "self.packages.\${system}.server";
      description = "Package providing the service binary.";
    };

    socket = lib.mkOption {
      type = lib.types.nullOr lib.types.path;
      default = "/var/run/dnd-encounter-manager-server/dnd-encounter-manager-server.sock";
      description = ''
        Path for the Unix domain socket used by the service.  When set,
        the server binds its own socket (no launchd socket activation) and
        the host/port options are ignored.  Set to null to use TCP instead.
      '';
    };

    # host and port are separate options (rather than a single "listen"
    # string) so that other Nix expressions can reference them
    # individually — e.g. firewall rules need the port, reverse proxy
    # configs need host:port, and health-check URLs need both.  The
    # module combines them into the --listen flag internally.
    host = lib.mkOption {
      type = lib.types.str;
      default = "127.0.0.1";
      description = "IP address to bind to.  Ignored when socket is set.";
    };

    port = lib.mkOption {
      type = lib.types.port;
      default = 3000;
      description = "TCP port to listen on.  Ignored when socket is set.";
    };

    logLevel = lib.mkOption {
      type = lib.types.enum ["trace" "debug" "info" "warn" "error"];
      default = "info";
      description = "Tracing log verbosity level.";
    };

    logFormat = lib.mkOption {
      type = lib.types.enum ["text" "json"];
      default = "json";
      description = ''
        Log output format.  Use "text" for human-readable local logs and
        "json" for structured logs consumed by a log aggregator.
      '';
    };

    frontendPath = lib.mkOption {
      type = lib.types.str;
      default = "${cfg.package}/share/dnd-encounter-manager-server/frontend";
      defaultText =
        lib.literalExpression
        ''"''${cfg.package}/share/dnd-encounter-manager-server/frontend"'';
      description = "Path to compiled frontend static assets.";
    };

    baseUrl = lib.mkOption {
      type = lib.types.str;
      example = "https://example.com";
      description = ''
        Public base URL of the service, used to construct the OIDC redirect
        URI ("<baseUrl>/auth/callback").
      '';
    };

    oidcIssuer = lib.mkOption {
      type = lib.types.nullOr lib.types.str;
      default = null;
      example = "https://sso.example.com/application/o/my-app";
      description = ''
        OIDC issuer URL used for provider discovery.  Set all three OIDC
        options or leave all three null for unauthenticated admin mode.
      '';
    };

    oidcClientId = lib.mkOption {
      type = lib.types.nullOr lib.types.str;
      default = null;
      description = ''
        OIDC client ID.  Set all three OIDC options or leave all three
        null for unauthenticated admin mode.
      '';
    };

    oidcClientSecretFile = lib.mkOption {
      type = lib.types.nullOr lib.types.path;
      default = null;
      description = ''
        Path to a file containing the OIDC client secret.  Set all three
        OIDC options or leave all three null for unauthenticated admin
        mode.
      '';
    };

    user = lib.mkOption {
      type = lib.types.str;
      default = "_dnd-encounter-manager-server";
      description = ''
        System user account the service runs as.  The leading underscore
        follows the macOS convention for daemon accounts.
      '';
    };

    group = lib.mkOption {
      type = lib.types.str;
      default = "_dnd-encounter-manager-server";
      description = ''
        System group the service runs as.  The leading underscore follows
        the macOS convention for daemon groups.
      '';
    };

    uid = lib.mkOption {
      type = lib.types.int;
      default = 401;
      description = ''
        UID for the service user.  nix-darwin requires a static UID for
        user creation.  The default (401) sits above macOS Sequoia's
        claimed 300-304 range and below the 501 normal-user boundary.
      '';
    };

    gid = lib.mkOption {
      type = lib.types.int;
      default = 401;
      description = ''
        GID for the service group.  nix-darwin requires a static GID for
        group creation.  The default (401) mirrors the UID choice.
      '';
    };

    healthCheck = {
      enable = lib.mkEnableOption "periodic health-check agent for the server";

      url = lib.mkOption {
        type = lib.types.str;
        default = "http://127.0.0.1:${toString cfg.port}/health";
        defaultText = lib.literalExpression ''"http://127.0.0.1:''${toString cfg.port}/health"'';
        example = "http://127.0.0.1:3000/health";
        description = ''
          URL to probe for health.  The agent runs curl against this
          endpoint every 30 seconds and kills the server if it fails,
          letting launchd's KeepAlive restart it.
        '';
      };
    };
  };

  config = lib.mkIf cfg.enable {
    assertions = [{
      assertion =
        let
          oidcFields = [ cfg.oidcIssuer cfg.oidcClientId cfg.oidcClientSecretFile ];
          setCount = lib.count (x: x != null) oidcFields;
        in
          setCount == 0 || setCount == 3;
      message = ''
        services.dnd-encounter-manager-server: OIDC configuration is partial.
        Set all three of oidcIssuer, oidcClientId, and oidcClientSecretFile,
        or leave all three null for unauthenticated admin mode.
      '';
    }];

    users.users.${cfg.user} = {
      uid = cfg.uid;
      gid = cfg.gid;
      home = "/var/empty";
      shell = "/usr/bin/false";
      description = "dnd-encounter-manager-server service user";
      isHidden = true;
    };

    users.groups.${cfg.group} = {
      gid = cfg.gid;
      members = [cfg.user];
    };

    users.knownUsers = [cfg.user];
    users.knownGroups = [cfg.group];

    # Create log and socket directories.  macOS has no tmpfiles equivalent,
    # so we use nix-darwin activation scripts.
    system.activationScripts.postActivation.text = let
      logDir = "/var/log/dnd-encounter-manager-server";
      sockDir =
        if cfg.socket != null
        then dirOf cfg.socket
        else null;
    in
      ''
        mkdir -p ${logDir}
        chown ${cfg.user}:${cfg.group} ${logDir}
        chmod 0750 ${logDir}
      ''
      + lib.optionalString (sockDir != null) ''
        mkdir -p ${sockDir}
        chown ${cfg.user}:${cfg.group} ${sockDir}
        chmod 0750 ${sockDir}
      '';

    launchd.servers.dnd-encounter-manager-server = {
      serviceConfig = {
        ProgramArguments = [
          "/bin/sh"
          "-c"
          "/bin/wait4path ${cfg.package} && exec ${execLine}"
        ];
        UserName = cfg.user;
        GroupName = cfg.group;
        RunAtLoad = true;
        KeepAlive = {
          Crashed = true;
          SuccessfulExit = false;
        };
        ThrottleInterval = 30;
        ProcessType = "Background";
        EnvironmentVariables = {
          LOG_LEVEL = cfg.logLevel;
          LOG_FORMAT = cfg.logFormat;
          BASE_URL = cfg.baseUrl;
        } // lib.optionalAttrs (cfg.oidcIssuer != null) {
          OIDC_ISSUER = cfg.oidcIssuer;
          OIDC_CLIENT_ID = cfg.oidcClientId;
          OIDC_CLIENT_SECRET_FILE = cfg.oidcClientSecretFile;
        };
        StandardOutPath = "/var/log/dnd-encounter-manager-server/stdout.log";
        StandardErrorPath = "/var/log/dnd-encounter-manager-server/stderr.log";
      };
    };

    # Optional health-check agent.  Probes the server's health endpoint
    # every 30 seconds and kills the server process on failure, letting
    # launchd's KeepAlive trigger a restart.
    launchd.servers.dnd-encounter-manager-server-healthcheck = lib.mkIf cfg.healthCheck.enable {
      serviceConfig = {
        ProgramArguments = [
          "/bin/sh"
          "-c"
          ''/usr/bin/curl -sf ${cfg.healthCheck.url} || /bin/kill $(/bin/cat /var/run/dnd-encounter-manager-server/pid) 2>/dev/null''
        ];
        StartInterval = 30;
        RunAtLoad = false;
        ProcessType = "Background";
        StandardOutPath = "/var/log/dnd-encounter-manager-server/healthcheck-stdout.log";
        StandardErrorPath = "/var/log/dnd-encounter-manager-server/healthcheck-stderr.log";
      };
    };
  };
}
